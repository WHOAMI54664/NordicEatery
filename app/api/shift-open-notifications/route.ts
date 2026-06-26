import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTelegramMessage } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeHtml(value: unknown) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

async function notifyStaffOnTelegram(payload: {
    email: string | null;
    phone: string | null;
    locale: string;
    source: string;
}) {
    try {
        await sendTelegramMessage(
            `🔔 <b>Ny avisering – köket stängt</b>\n\n` +
            `📧 Email: ${escapeHtml(payload.email || "—")}\n` +
            `📞 Telefon: ${escapeHtml(payload.phone || "—")}\n` +
            `🌐 Språk: ${escapeHtml(payload.locale)}\n` +
            `📍 Källa: ${escapeHtml(payload.source)}`
        );
    } catch (error) {
        // Non-fatal: the request is already saved in the database.
        console.error("Shift notification Telegram error:", error);
    }
}

type RequestBody = {
    email?: string;
    phone?: string;
    locale?: string;
    source?: string;
};

function normalizeEmail(value?: string | null) {
    const email = value?.trim().toLowerCase();

    if (!email) return null;

    return email;
}

function normalizePhone(value?: string | null) {
    const phone = value?.trim();

    if (!phone) return null;

    return phone.replace(/[^\d+]/g, "");
}

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as RequestBody;

        const email = normalizeEmail(body.email);
        const phone = normalizePhone(body.phone);
        const locale = body.locale || "sv";
        const source = body.source || "menu_closed_modal";

        if (!email && !phone) {
            return NextResponse.json(
                { error: "Email or phone is required" },
                { status: 400 }
            );
        }

        const supabase = createAdminClient();

        const { error } = await supabase
            .from("shift_open_notifications")
            .insert({
                email,
                phone,
                locale,
                source,
                status: "pending",
            });

        if (error) {
            console.error("Shift notification request error:", error);

            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        await notifyStaffOnTelegram({ email, phone, locale, source });

        return NextResponse.json({
            success: true,
        });
    } catch (error) {
        console.error("Shift notification API error:", error);

        return NextResponse.json(
            { error: "Could not save notification request" },
            { status: 500 }
        );
    }
}