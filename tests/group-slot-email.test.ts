import assert from "node:assert/strict";
import { test } from "node:test";
import { sendGroupSlotEmails } from "../lib/notifications/send-group-slot-emails";
import { groupSlotMessage } from "../lib/notifications/group-slot-email";
import { POST } from "../app/api/group-order-notifications/route";

test("availability emails are one-shot, bounded, private and idempotent across uncertain sends", async (t) => {
  const env = { ...process.env };
  Object.assign(process.env, {
    GROUP_ORDERS_ENABLED: "true",
    NEXT_PUBLIC_SITE_URL: "https://restaurant.test",
    NEXT_PUBLIC_SUPABASE_URL: "https://slot-email.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "test-only",
    CRON_SECRET: "a".repeat(64),
    RESEND_API_KEY: "re_test_only",
    RESEND_FROM_EMAIL: "Test <test@example.test>",
  });
  t.after(() => {
    process.env = env;
  });
  const job = {
    id: "33333333-3333-4333-8333-333333333333",
    email: "recipient@example.test",
    locale: "ru",
    unsubscribe_token: "44444444-4444-4444-8444-444444444444",
    status: "sending",
  };
  let claimed = false,
    available = true,
    cancel = false,
    failSave = true,
    providerCalls = 0;
  const messages: string[] = [],
    keys: string[] = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      let result: unknown;
      if (url.hostname === "api.resend.com") {
        assert.equal(url.pathname, "/emails");
        assert.ok(init?.signal, "provider calls require timeout");
        assert.equal(init.redirect, "error");
        messages.push(String(init.body));
        keys.push(new Headers(init.headers).get("Idempotency-Key")!);
        providerCalls++;
        return Response.json({ id: "email-provider-id" });
      }
      assert.equal(
        url.hostname,
        "slot-email.invalid",
        "no production requests in tests",
      );
      const name = url.pathname.split("/").at(-1);
      if (name === "claim_group_slot_email") {
        result = claimed ? [] : [job];
        claimed = true;
      } else if (name === "group_slot_notifications") {
        if (init?.method === "PATCH") {
          if (failSave)
            return Response.json(
              { message: "database unavailable" },
              { status: 503 },
            );
          result = [];
        } else result = { status: cancel ? "cancelled" : "sending" };
      } else if (name === "group_pickup_availability")
        result = {
          date: "2026-10-11",
          slots: [
            { time: "10:40", pickupAt: "2026-10-11T08:40:00Z", available },
            {
              time: "11:00",
              pickupAt: "2026-10-11T09:00:00Z",
              available: false,
            },
          ],
        };
      else if (name === "subscribe_group_slot_email") result = null;
      else throw new Error(`Unexpected test endpoint ${name}`);
      return Response.json(result);
    },
  );
  await assert.rejects(sendGroupSlotEmails(), /receipt save failed/);
  claimed = false;
  failSave = false;
  assert.equal((await sendGroupSlotEmails()).accepted, 1);
  assert.equal(providerCalls, 2);
  assert.equal(keys[0], keys[1]);
  assert.equal(
    messages[0],
    messages[1],
    "an uncertain retry must use an identical provider payload",
  );
  claimed = false;
  available = false;
  assert.equal((await sendGroupSlotEmails()).accepted, 0);
  claimed = false;
  available = true;
  cancel = true;
  assert.equal((await sendGroupSlotEmails()).accepted, 0);
  assert.equal(providerCalls, 2);
  const request = (origin: string, body: unknown) =>
    new Request("https://restaurant.test/api/group-order-notifications", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  assert.equal(
    (
      await POST(
        request("https://evil.test", { email: "recipient@example.test" }),
      )
    ).status,
    403,
  );
  assert.equal(
    (await POST(request("https://restaurant.test", { email: "invalid" })))
      .status,
    400,
  );
  const saved = await POST(
    request("https://restaurant.test", {
      email: "recipient@example.test",
      locale: "ru",
    }),
  );
  assert.equal(saved.status, 200);
  assert.deepEqual(await saved.json(), { success: true });
  for (const language of ["sv", "en", "ru", "pl"]) {
    const message = groupSlotMessage(
      language,
      job.unsubscribe_token,
      "https://restaurant.test",
    );
    assert.ok(message.text.includes(`/${language}/group-order`));
    assert.ok(
      message.text.includes(`/unsubscribe?token=${job.unsubscribe_token}`),
    );
    assert.ok(!message.text.includes(job.email));
  }
  const swedish = groupSlotMessage(
    "sv",
    job.unsubscribe_token,
    "https://restaurant.test",
  );
  assert.equal(
    swedish.text,
    [
      "Hej!",
      "",
      "Det finns nu lediga tider för",
      "gruppbeställningar hos Nordic Eatery!",
      "",
      "Välj en tillgänglig upphämtningstid och",
      "förbeställ lunch till dig och dina kollegor.",
      "",
      "Upphämtning: SSAB, vid snurrgrinden till",
      "Minimillområdet, i anslutning till Camp West.",
      "",
      "Boka här: https://restaurant.test/sv/group-order",
      "",
      "Antalet portioner per upphämtningstid är",
      "begränsat, så först till kvarn gäller!",
      "",
      "Med vänliga hälsningar,",
      "Nordic Eatery",
      "Local Soul, Global Taste.",
      "",
      `Avsluta denna avisering: https://restaurant.test/api/group-order-notifications/unsubscribe?token=${job.unsubscribe_token}`,
    ].join("\n"),
  );
});
