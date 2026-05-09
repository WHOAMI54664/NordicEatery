import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    try {
        const backendUrl = process.env.SWISH_BACKEND_URL;
        const internalSecret = process.env.SWISH_INTERNAL_SECRET;

        if (!backendUrl) {
            return NextResponse.json(
                { error: "SWISH_BACKEND_URL is missing" },
                { status: 500 }
            );
        }

        if (!internalSecret) {
            return NextResponse.json(
                { error: "SWISH_INTERNAL_SECRET is missing" },
                { status: 500 }
            );
        }

        const body = await request.text();

        const response = await fetch(`${backendUrl}/swish/callback`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-internal-secret": internalSecret,
            },
            body,
            cache: "no-store",
        });

        const text = await response.text();

        if (!response.ok) {
            console.error("Swish callback backend error:", text);

            return NextResponse.json(
                {
                    error: "Swish callback forwarding failed",
                    details: text,
                },
                { status: response.status }
            );
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error("Swish callback proxy error:", error);

        const message =
            error instanceof Error ? error.message : "Swish callback failed";

        return NextResponse.json({ error: message }, { status: 500 });
    }
}