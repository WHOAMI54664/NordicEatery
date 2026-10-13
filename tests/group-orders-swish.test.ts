import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { swishGroupHandler } from "../src/swish-group";
import {
  swishInstruction,
  swishPhone,
  groupSwish,
} from "../lib/group-orders/swish";
import type { GroupPayment } from "../lib/group-orders/model";

test("Swish gateway: authorization, immutable instructions, uncertain create, cancellation race and refunds", async () => {
  const payments = new Map<string, Record<string, unknown>>();
  let calls = 0,
    creates = 0,
    refunds = 0,
    loseCreateResponse = true;
  const handler = swishGroupHandler({
    secret: () => "internal-test-secret",
    callbackUrl: () =>
      "https://preview.example/api/group-orders/swish-callback",
    payeeAlias: () => "1234679304",
    request: async (method, path, body) => {
      calls++;
      const id = path.split("/").at(-1)!;
      if (method === "GET")
        return {
          status: payments.has(id) ? 200 : 404,
          data: structuredClone(payments.get(id)),
        };
      if (method === "PUT") {
        const data = body as Record<string, unknown>;
        assert.equal(
          new URL(String(data.callbackUrl)).origin,
          "https://preview.example",
        );
        assert.ok(
          new URL(String(data.callbackUrl)).searchParams.get("groupId"),
        );
        assert.match(path, /^\/v2\/(paymentrequests|refunds)\/[A-F0-9]{32}$/);
        if (payments.has(id)) return { status: 422, data: [] };
        const refund = path.includes("refunds");
        refund ? refunds++ : creates++;
        payments.set(id, {
          ...data,
          id,
          status: refund ? "DEBITED" : "CREATED",
        });
        if (loseCreateResponse) {
          loseCreateResponse = false;
          throw new Error("Timeout after provider commit");
        }
        return { status: 201, data: {} };
      }
      assert.deepEqual(body, [
        { op: "replace", path: "/status", value: "cancelled" },
      ]);
      // The payer completed their transfer just before cancellation reached Swish.
      Object.assign(payments.get(id)!, {
        status: "PAID",
        paymentReference: "VERIFIEDPAYMENT",
      });
      return { status: 422, data: [] };
    },
  });
  const paymentId = randomUUID();
  const body = {
    operation: "create",
    id: swishInstruction(paymentId),
    reference: swishInstruction(paymentId),
    groupId: randomUUID(),
    payerAlias: "46701234567",
    amount: 12950,
  };
  async function call(input: unknown, secret = "internal-test-secret") {
    let status = 200,
      data: Record<string, unknown> = {};
    const res = {
      status(code: number) {
        status = code;
        return this;
      },
      json(value: Record<string, unknown>) {
        data = value;
        return this;
      },
    };
    await handler(
      { body: input, get: () => secret } as unknown as Request,
      res as unknown as Response,
    );
    return { status, data };
  }
  assert.equal((await call(body, "wrong")).status, 401);
  assert.equal((await call({ ...body, amount: 1 })).status, 400);
  assert.equal(calls, 0);
  assert.equal((await call(body)).status, 503);
  assert.equal((await call(body)).data.status, "CREATED");
  assert.equal(creates, 1, "uncertain create reuses its original instruction");
  assert.equal((await call({ ...body, amount: 12951 })).status, 503);
  assert.equal(
    (await call({ ...body, operation: "cancel" })).data.status,
    "PAID",
  );
  const refund = {
    ...body,
    operation: "refund",
    id: swishInstruction(paymentId, true),
    originalPaymentReference: "VERIFIEDPAYMENT",
  };
  assert.equal((await call(refund)).data.status, "DEBITED");
  assert.equal((await call(refund)).data.status, "DEBITED");
  assert.equal(refunds, 1);
  payments.get(refund.id)!.status = "PAID";
  payments.get(refund.id)!.paymentReference = "VERIFIEDREFUND";
  assert.equal((await call(refund)).data.status, "PAID");
});

test("Swish client: Swedish phone validation and verified amount/reference, no caller-supplied destination", async (t) => {
  assert.equal(swishPhone("+46 70 123 45 67"), "46701234567");
  assert.equal(swishPhone("070-1234567"), "46701234567");
  assert.throws(() => swishPhone("not a phone"), /invalidPhone/);
  process.env.SWISH_BACKEND_URL = "https://swish-test.invalid";
  process.env.SWISH_INTERNAL_SECRET = "internal-test-secret";
  const payment: GroupPayment = {
    id: randomUUID(),
    memberId: randomUUID(),
    amount: 12950,
    status: "pending",
    payerAlias: "46701234567",
  };
  let amount = "129.50";
  t.mock.method(
    globalThis,
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      assert.equal(String(input), "https://swish-test.invalid/swish/group");
      assert.equal(
        new Headers(init?.headers).get("x-internal-secret"),
        "internal-test-secret",
      );
      assert.ok(init?.signal);
      assert.equal(init?.redirect, "error");
      return new Response(
        JSON.stringify({
          id: swishInstruction(payment.id),
          status: "PAID",
          currency: "SEK",
          amount,
          payeePaymentReference: swishInstruction(payment.id),
          paymentReference: "PAYMENT",
        }),
      );
    },
  );
  assert.equal(
    (await groupSwish("read", randomUUID(), payment)).status,
    "PAID",
  );
  amount = "12.95";
  await assert.rejects(
    groupSwish("read", randomUUID(), payment),
    /paymentMismatch/,
  );
});
