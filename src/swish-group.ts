import express, { type Request, type Response } from "express";
import { timingSafeEqual } from "node:crypto";

type Result = { status: number; data: unknown };
type Options = {
  request: (
    method: "GET" | "PUT" | "PATCH",
    path: string,
    body: unknown,
    signal: AbortSignal,
  ) => Promise<Result>;
  secret: () => string | undefined;
  callbackUrl: () => string | undefined;
  payeeAlias: () => string | undefined;
};

/** Transport-only routes: group shares must never create individual kitchen orders. */
export function swishGroupRouter(options: Options) {
  const router = express.Router();
  router.post("/swish/group", swishGroupHandler(options));
  return router;
}

export function swishGroupHandler(options: Options) {
  return async (req: Request, res: Response) => {
    const secret = options.secret();
    const supplied = req.get("x-internal-secret") || "";
    if (
      !secret ||
      Buffer.byteLength(secret) !== Buffer.byteLength(supplied) ||
      !timingSafeEqual(Buffer.from(secret), Buffer.from(supplied))
    )
      return res.status(401).json({ error: "unauthorized" });
    try {
      const {
        operation,
        id,
        groupId,
        amount,
        payerAlias,
        reference,
        originalPaymentReference,
      } = req.body || {};
      if (
        !["create", "read", "cancel", "refund"].includes(operation) ||
        typeof id !== "string" ||
        typeof groupId !== "string" ||
        typeof reference !== "string" ||
        !/^[A-F0-9]{32}$/.test(id || "") ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
          groupId || "",
        ) ||
        !/^[A-F0-9]{32}$/.test(reference || "") ||
        !Number.isSafeInteger(amount) ||
        amount < 300 ||
        amount > 10000000
      )
        return res.status(400).json({ error: "invalidInput" });
      const refund = operation === "refund";
      if (
        refund
          ? typeof originalPaymentReference !== "string" ||
            !/^[A-Za-z0-9]{1,64}$/.test(originalPaymentReference)
          : typeof payerAlias !== "string" || !/^46\d{9}$/.test(payerAlias)
      )
        return res.status(400).json({ error: "invalidInput" });
      const callbackBase = options.callbackUrl();
      const alias = options.payeeAlias();
      if (!callbackBase || !alias)
        return res.status(503).json({ error: "unavailable" });
      const callback = new URL(callbackBase);
      if (
        callback.protocol !== "https:" ||
        callback.username ||
        callback.password ||
        callback.hash
      )
        return res.status(503).json({ error: "unavailable" });
      callback.searchParams.set("groupId", groupId);
      const resource = refund ? "refunds" : "paymentrequests";
      const path = `/v1/${resource}/${id}`;
      // One bounded gateway operation, shorter than the website's 15s timeout.
      const signal = AbortSignal.timeout(12000);
      const request = (
        method: "GET" | "PUT" | "PATCH",
        resource: string,
        body?: unknown,
      ) => options.request(method, resource, body, signal);
      let result = await request("GET", path);
      // Retry uses the SAME instruction UUID after an uncertain network result.
      if (result.status === 404 && (operation === "create" || refund)) {
        await request("PUT", `/v2/${resource}/${id}`, {
          amount: (amount / 100).toFixed(2),
          currency: "SEK",
          callbackUrl: callback.toString(),
          ...(refund
            ? { originalPaymentReference, payerAlias: alias }
            : {
                payeeAlias: alias,
                payerAlias,
                payeePaymentReference: reference,
              }),
          message: refund
            ? "Nordic Eatery refund"
            : "Nordic Eatery group order",
        });
        // GET also recovers a duplicate PUT. No callback payload is trusted as proof of payment.
        result = await request("GET", path);
      }
      const matches = (value: unknown): value is Record<string, unknown> => {
        if (!value || typeof value !== "object") return false;
        const p = value as Record<string, unknown>;
        return (
          p.id === id &&
          p.currency === "SEK" &&
          /^\d+(\.\d{1,2})?$/.test(String(p.amount)) &&
          Math.round(Number(p.amount) * 100) === amount &&
          (refund
            ? ["CREATED", "DEBITED", "PAID", "ERROR"].includes(String(p.status))
            : ["CREATED", "PAID", "DECLINED", "CANCELLED", "ERROR"].includes(
                String(p.status),
              )) &&
          (p.status !== "PAID" ||
            (typeof p.paymentReference === "string" &&
              /^[A-Za-z0-9]{1,64}$/.test(p.paymentReference))) &&
          (refund
            ? p.originalPaymentReference === originalPaymentReference &&
              p.payerAlias === alias
            : p.payeePaymentReference === reference &&
              p.payeeAlias === alias &&
              p.payerAlias === payerAlias)
        );
      };
      if (result.status !== 200 || !matches(result.data))
        return res.status(503).json({ error: "paymentMismatch" });
      if (operation === "cancel" && result.data.status === "CREATED") {
        await request("PATCH", path, [
          { op: "replace", path: "/status", value: "cancelled" },
        ]);
        // Payment may win the race against cancellation; retrieve its authoritative status.
        result = await request("GET", path);
      }
      if (result.status !== 200 || !matches(result.data))
        return res.status(503).json({ error: "paymentMismatch" });
      const p = result.data;
      return res.json({
        id: p.id,
        status: p.status,
        amount: String(p.amount),
        currency: p.currency,
        paymentReference: p.paymentReference,
        payeePaymentReference: p.payeePaymentReference,
        originalPaymentReference: p.originalPaymentReference,
      });
    } catch {
      // Axios errors contain certificate configuration and headers; never log them.
      console.error("Swish group transport failed");
      return res.status(503).json({ error: "unavailable" });
    }
  };
}
