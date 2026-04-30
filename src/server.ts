import "dotenv/config";
import express from "express";
import axios from "axios";
import https from "https";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json());

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
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

app.get("/health", (_req, res) => {
    res.json({ ok: true });
});

app.post("/swish/create", async (req, res) => {
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

        const { error: orderError } = await supabase.from("orders").upsert({
            order_number: orderNumber,
            customer_name: customerName,
            customer_phone: customerPhone,
            address,
            delivery_type: deliveryType,
            comment: comment || null,
            items,
            total_price: totalPrice,
            status: "new",
            payment_method: "swish",
            payment_status: "awaiting_payment",
        });

        if (orderError) {
            return res.status(500).json({ error: orderError.message });
        }

        const paymentRequest = {
            payeePaymentReference: orderNumber.replace(/[^a-zA-Z0-9]/g, "").slice(0, 35),
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
                headers: {
                    "Content-Type": "application/json",
                },
                validateStatus: () => true,
            }
        );

        if (response.status !== 201) {
            console.error("Swish create error:", response.status, response.data);

            await supabase
                .from("orders")
                .update({
                    payment_status: "failed",
                    updated_at: new Date().toISOString(),
                })
                .eq("order_number", orderNumber);

            return res.status(500).json({
                error: "Swish payment request failed",
                details: response.data,
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
                paymentRequestToken
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
        console.error("Swish create exception:", error);
        return res.status(500).json({ error: "Could not create Swish payment" });
    }
});

app.post("/swish/callback", async (req, res) => {
    try {
        const payload = req.body;

        console.log("Swish callback:", payload);

        const orderReference = payload.payeePaymentReference;
        const status = payload.status;

        if (!orderReference || !status) {
            return res.status(400).json({ error: "Invalid callback payload" });
        }

        const paymentStatus =
            status === "PAID"
                ? "paid"
                : status === "DECLINED" || status === "CANCELLED"
                    ? "cancelled"
                    : "failed";

        const { error } = await supabase
            .from("orders")
            .update({
                payment_status: paymentStatus,
                swish_payment_id: payload.id || null,
                swish_payment_reference: payload.paymentReference || null,
                updated_at: new Date().toISOString(),
            })
            .eq("order_number", orderReference.startsWith("MF-") ? orderReference : null);

        if (error) {
            console.error("Supabase callback update error:", error);
            return res.status(500).json({ error: error.message });
        }

        return res.status(200).json({ received: true });
    } catch (error) {
        console.error("Swish callback exception:", error);
        return res.status(500).json({ error: "Callback failed" });
    }
});

const port = Number(process.env.PORT || 4001);

app.listen(port, () => {
    console.log(`Swish server running on port ${port}`);
});