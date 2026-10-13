import "dotenv/config";
import express from "express";
import axios from "axios";
import https from "https";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import {
    internalSwishRequest,
    validSwishCallbackId,
    verifiedSwishPayment,
} from "./swish-verification";
import { swishGroupService } from "./swish-group-service";

const app = express();
app.use(express.json());

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const isTest = process.env.SWISH_ENV !== "production";

const swishBaseUrl = isTest
    ? "https://mss.cpc.getswish.net/swish-cpcapi/api/v1"
    : "https://cpc.getswish.net/swish-cpcapi/api/v1";

function getSwishAgent() {
    return new https.Agent({
        pfx: fs.readFileSync(process.env.SWISH_CERT_PATH!),
        passphrase: process.env.SWISH_CERT_PASSPHRASE,
        ca: fs.readFileSync(process.env.SWISH_CA_PATH!),
        rejectUnauthorized: true,
    });
}

function normalizeAmount(amount: number) {
    return amount.toFixed(2);
}

app.use(swishGroupService());

app.get("/health", (_req, res) => {
    res.json({ ok: true });
});

app.post("/swish/create", async (req, res) => {
    if (
        !internalSwishRequest(
            process.env.SWISH_INTERNAL_SECRET,
            req.get("x-internal-secret"),
        )
    )
        return res.status(401).json({ error: "Unauthorized" });
    try {
        const {
            orderNumber,
            customerName,
            customerPhone,
            address,
            deliveryType,
            comment,
            items,
            totalPrice,
            locale = "sv",
        } = req.body;

        if (!orderNumber || !items?.length || !totalPrice) {
            return res.status(400).json({ error: "Missing order data" });
        }

        const { error: orderError } = await supabase.from("orders").insert({
            order_number: orderNumber,
            customer_name: customerName,
            customer_phone: customerPhone,
            address,
            delivery_type: deliveryType,
            comment: comment || null,
            items,
            total_price: totalPrice,
            total_gross: Number(totalPrice),
            status: "new",
            payment_method: "swish",
            payment_status: "awaiting_payment",
        });

        if (orderError) {
            return res
                .status(orderError.code === "23505" ? 409 : 500)
                .json({ error: "Could not create order" });
        }

        const paymentRequest = {
            payeePaymentReference: orderNumber
                .replace(/[^a-zA-Z0-9]/g, "")
                .slice(0, 35),
            callbackUrl: process.env.SWISH_CALLBACK_URL,
            payeeAlias: process.env.SWISH_PAYEE_ALIAS,
            amount: normalizeAmount(Number(totalPrice)),
            currency: "SEK",
            message: `Order ${orderNumber}`.slice(0, 50),
        };

        const response = await axios.post(
            `${swishBaseUrl}/paymentrequests`,
            paymentRequest,
            {
                httpsAgent: getSwishAgent(),
                timeout: 10000,
                maxRedirects: 0,
                headers: {
                    "Content-Type": "application/json",
                },
                validateStatus: () => true,
            },
        );

        if (response.status !== 201) {
            console.error("Swish create failed", { status: response.status });

            await supabase
                .from("orders")
                .update({
                    payment_status: "failed",
                    updated_at: new Date().toISOString(),
                })
                .eq("order_number", orderNumber);

            return res.status(500).json({
                error: "Swish payment request failed",
            });
        }

        const location = response.headers.location as string | undefined;
        const paymentRequestToken =
            response.headers.paymentrequesttoken ||
            response.headers["paymentrequesttoken"];

        const swishPaymentId = location?.split("/").pop();

        await supabase
            .from("orders")
            .update({
                swish_payment_id: swishPaymentId || null,
                swish_token: paymentRequestToken || null,
                updated_at: new Date().toISOString(),
            })
            .eq("order_number", orderNumber);

        const returnUrl = `https://nordiceatery.se/${locale}/order/${orderNumber}`;

        const swishUrl = paymentRequestToken
            ? `swish://paymentrequest?token=${encodeURIComponent(
                  paymentRequestToken,
              )}&callbackurl=${encodeURIComponent(returnUrl)}`
            : null;

        return res.json({
            orderNumber,
            swishPaymentId,
            paymentRequestToken,
            swishUrl,
            trackingUrl: returnUrl,
        });
    } catch (error) {
        console.error("Swish create exception", {
            kind: error instanceof Error ? error.name : "unknown",
        });
        return res
            .status(500)
            .json({ error: "Could not create Swish payment" });
    }
});

app.post("/swish/callback", async (req, res) => {
    try {
        // Callback content only identifies work; the provider GET is the payment proof.
        const id = req.body?.id;
        if (!validSwishCallbackId(id))
            return res.status(400).json({ error: "Invalid callback" });
        const { data: order, error: lookupError } = await supabase
            .from("orders")
            .select(
                "id, order_number, total_gross, total_price, payment_status",
            )
            .eq("swish_payment_id", id)
            .eq("payment_method", "swish")
            .maybeSingle();
        if (lookupError)
            return res.status(503).json({ error: "Order lookup failed" });
        if (!order) return res.status(404).json({ error: "Unknown payment" });
        if (!process.env.SWISH_PAYEE_ALIAS)
            return res.status(503).json({ error: "Swish unavailable" });
        const response = await axios.get(
            `${swishBaseUrl}/paymentrequests/${id}`,
            {
                httpsAgent: getSwishAgent(),
                timeout: 10000,
                maxRedirects: 0,
                validateStatus: () => true,
            },
        );
        const payment =
            response.status === 200
                ? verifiedSwishPayment(response.data, {
                      id,
                      orderNumber: order.order_number,
                      amount: Number(order.total_gross ?? order.total_price),
                      payeeAlias: process.env.SWISH_PAYEE_ALIAS,
                  })
                : null;
        if (!payment)
            return res
                .status(503)
                .json({ error: "Payment verification failed" });
        if (payment.status === "CREATED") return res.json({ received: true });
        const paymentStatus =
            payment.status === "PAID"
                ? "paid"
                : payment.status === "DECLINED" ||
                    payment.status === "CANCELLED"
                  ? "cancelled"
                  : "failed";
        const { error } = await supabase
            .from("orders")
            .update({
                payment_status: paymentStatus,
                swish_payment_reference: payment.paymentReference,
                ...(paymentStatus === "paid"
                    ? { paid_at: new Date().toISOString() }
                    : {}),
                updated_at: new Date().toISOString(),
            })
            .eq("id", order.id)
            .eq("swish_payment_id", id)
            .eq("payment_status", "awaiting_payment");
        if (error)
            return res.status(503).json({ error: "Could not confirm payment" });
        return res.status(200).json({ received: true });
    } catch (error) {
        console.error("Swish callback exception", {
            kind: error instanceof Error ? error.name : "unknown",
        });
        return res.status(500).json({ error: "Callback failed" });
    }
});

const port = Number(process.env.PORT || 4001);

app.listen(port, () => {
    console.log(`Swish server running on port ${port}`);
});
