import assert from "node:assert/strict";
import { test } from "node:test";
import { groupWorkerReady, validWorkerSecret } from "../lib/group-orders/http";

test("Vault worker authorization fails closed and never accepts public readiness as a credential", async (t) => {
  const original = { ...process.env };
  delete process.env.CRON_SECRET;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://worker-test.invalid";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "isolated-test-key";
  t.after(() => {
    process.env = original;
  });
  let ready = true;
  let unavailable = false;
  let calls = 0;
  t.mock.method(
    globalThis,
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      assert.equal(url.hostname, "worker-test.invalid");
      calls++;
      if (unavailable)
        return new Response('{"message":"unavailable"}', { status: 503 });
      if (url.pathname.endsWith("/group_order_worker_ready"))
        return new Response(JSON.stringify(ready));
      assert.ok(url.pathname.endsWith("/authorize_group_order_worker"));
      const body = JSON.parse(String(init?.body));
      return new Response(JSON.stringify(body.p_token === "a".repeat(64)));
    },
  );
  const request = (token: string) =>
    new Request("https://restaurant.test/api/cron/group-orders", {
      headers: { authorization: token },
    });
  assert.equal(await validWorkerSecret(request("Bearer public")), false);
  assert.equal(calls, 0);
  assert.equal(await groupWorkerReady(), true);
  assert.equal(
    await validWorkerSecret(request(`Bearer ${"b".repeat(64)}`)),
    false,
  );
  assert.equal(
    await validWorkerSecret(request(`Bearer ${"a".repeat(64)}`)),
    true,
  );
  ready = false;
  assert.equal(await groupWorkerReady(), false);
  unavailable = true;
  assert.equal(await groupWorkerReady(), false);
  assert.equal(
    await validWorkerSecret(request(`Bearer ${"a".repeat(64)}`)),
    false,
  );
});
