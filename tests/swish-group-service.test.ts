import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import axios from "axios";
import express from "express";
import {
  swishGroupService,
  swishGroupTransport,
} from "../src/swish-group-service";
import { swishGroupRouter } from "../src/swish-group";

test("group transport uses deployed PEM or PFX identity with bounded, verified TLS", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "swish-transport-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const cert = join(dir, "cert.pem"),
    key = join(dir, "key.pem"),
    pfx = join(dir, "cert.p12");
  writeFileSync(
    cert,
    "-----BEGIN CERTIFICATE-----\ntest-only\n-----END CERTIFICATE-----",
  );
  writeFileSync(key, "test-only-key");
  writeFileSync(pfx, "test-only-pfx");
  const env = {
    SWISH_MODE: "production",
    SWISH_CERT_PATH: cert,
    SWISH_KEY_PATH: key,
  };
  const signal = AbortSignal.timeout(12000);
  const configs: Parameters<typeof axios.request>[0][] = [];
  t.mock.method(
    axios,
    "request",
    async (config: Parameters<typeof axios.request>[0]) => {
      configs.push(config);
      return { status: 404, data: "" };
    },
  );
  const transport = swishGroupTransport(env);
  assert.deepEqual(
    await transport(
      "GET",
      `/v1/paymentrequests/${"A".repeat(32)}`,
      undefined,
      signal,
    ),
    { status: 404, data: "" },
  );
  const config = configs[0]!;
  assert.equal(
    config.url,
    `https://cpc.getswish.net/swish-cpcapi/api/v1/paymentrequests/${"A".repeat(32)}`,
  );
  assert.equal(config.signal, signal);
  assert.equal(config.timeout, 10000);
  assert.equal(config.maxRedirects, 0);
  assert.equal(config.maxContentLength, 65536);
  assert.equal(config.httpsAgent.options.rejectUnauthorized, true);
  assert.equal(config.httpsAgent.options.minVersion, "TLSv1.2");
  assert.equal(config.httpsAgent.options.key.toString(), "test-only-key");
  assert.equal(config.httpsAgent.options.pfx, undefined);
  await swishGroupTransport({
    SWISH_ENV: "test",
    SWISH_CERT_PATH: pfx,
    SWISH_CERT_PASSPHRASE: "test-only",
  })("PATCH", `/v1/paymentrequests/${"B".repeat(32)}`, [], signal);
  assert.match(configs[1]!.url!, /^https:\/\/mss\.cpc\.getswish\.net\//);
  assert.equal(configs[1]!.httpsAgent.options.pfx.toString(), "test-only-pfx");
  assert.equal(configs[1]!.httpsAgent.options.passphrase, "test-only");
  assert.deepEqual(configs[1]!.headers, {
    "Content-Type": "application/json-patch+json",
  });
  for (const patch of [
    { SWISH_MODE: undefined },
    { SWISH_MODE: "mock" },
    { SWISH_ENV: "test" },
    { SWISH_KEY_PATH: undefined },
    { SWISH_API_URL: "https://attacker.invalid/sw ish" },
    {
      SWISH_RETRIEVE_API_URL:
        "https://mss.cpc.getswish.net/swish-cpcapi/api/v1/paymentrequests",
    },
  ])
    assert.throws(() => swishGroupTransport({ ...env, ...patch }));
  await assert.rejects(
    transport("GET", "https://attacker.invalid", undefined, signal),
  );
  assert.equal(
    configs.length,
    2,
    "invalid configuration/resources never reach the network",
  );
});

test("additive group route preserves ordinary routes and fails closed before configuration or provider access", async (t) => {
  const app = express();
  app.use(express.json());
  app.use(swishGroupService({ SWISH_INTERNAL_SECRET: "test-only" }));
  app.get("/health", (_req, res) =>
    res.json({ ok: true, service: "ordinary" }),
  );
  const server = app.listen(0, "127.0.0.1");
  t.after(() => server.close());
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  assert.deepEqual(await (await fetch(`${base}/health`)).json(), {
    ok: true,
    service: "ordinary",
  });
  const body = {
    operation: "create",
    id: "A".repeat(32),
    reference: "A".repeat(32),
    groupId: "11111111-1111-4111-8111-111111111111",
    amount: 15000,
    payerAlias: "46701234567",
  };
  const send = (secret: string) =>
    fetch(`${base}/swish/group`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": secret,
      },
      body: JSON.stringify(body),
    });
  assert.equal((await send("wrong")).status, 401);
  assert.equal((await send("test-only")).status, 503);
});

test("group gateway rejects malformed, mismatched and unverified provider responses", async (t) => {
  const body = {
    operation: "read",
    id: "A".repeat(32),
    reference: "A".repeat(32),
    groupId: "11111111-1111-4111-8111-111111111111",
    amount: 15000,
    payerAlias: "46701234567",
  };
  const valid = {
    id: body.id,
    payeePaymentReference: body.reference,
    payerAlias: body.payerAlias,
    payeeAlias: "1234679304",
    amount: "150.00",
    currency: "SEK",
    status: "PAID",
    paymentReference: "VERIFIED",
  };
  let payment: unknown = valid;
  let calls = 0;
  const app = express();
  app.use(express.json());
  app.use(
    swishGroupRouter({
      secret: () => "test-only",
      callbackUrl: () =>
        "https://restaurant.test/api/group-orders/swish-callback",
      payeeAlias: () => valid.payeeAlias,
      request: async (_method, _path, _data, signal) => {
        calls++;
        assert.ok(signal instanceof AbortSignal);
        assert.equal(signal.aborted, false);
        return { status: 200, data: payment };
      },
    }),
  );
  const server = app.listen(0, "127.0.0.1");
  t.after(() => server.close());
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/swish/group`;
  const send = (input = body) =>
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": "test-only",
      },
      body: JSON.stringify(input),
    });
  for (const input of [
    { ...body, groupId: "-".repeat(36) },
    { ...body, id: [body.id] },
    { ...body, payerAlias: [body.payerAlias] },
  ])
    assert.equal((await send(input as typeof body)).status, 400);
  assert.equal(calls, 0);
  for (const patch of [
    null,
    { status: "FORGED" },
    { paymentReference: undefined },
    { payerAlias: "46707654321" },
    { payeeAlias: "1234567890" },
    { amount: "1.00" },
    { currency: "EUR" },
    { id: "B".repeat(32) },
    { payeePaymentReference: "OTHER" },
  ]) {
    payment = patch === null ? null : { ...valid, ...patch };
    assert.equal((await send()).status, 503);
  }
  payment = valid;
  assert.equal((await send()).status, 200);
});
