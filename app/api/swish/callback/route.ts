import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    try {
        const body = await request.text();

        const response = await fetch(`${process.env.SWISH_BACKEND_URL}/swish/callback`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-internal-secret": process.env.SWISH_INTERNAL_SECRET || "",
            },
            body,
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: "Swish callback forwarding failed" },
                { status: 500 }
            );
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error("Swish callback proxy error:", error);

        return NextResponse.json(
            { error: "Swish callback failed" },
            { status: 500 }
        );
    }
}