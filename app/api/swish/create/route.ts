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

        const body = await request.json();

        const response = await fetch(`${backendUrl}/swish/create`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-internal-secret": internalSecret,
            },
            body: JSON.stringify(body),
            cache: "no-store",
        });

        const text = await response.text();

        let data: unknown;

        try {
            data = text ? JSON.parse(text) : {};
        } catch {
            data = { error: text || "Invalid backend response" };
        }

        if (!response.ok) {
            return NextResponse.json(
                {
                    error:
                        typeof data === "object" &&
                        data !== null &&
                        "error" in data
                            ? String(data.error)
                            : "Swish payment failed",
                    details: data,
                },
                { status: response.status }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Swish proxy error:", error);

        const message =
            error instanceof Error ? error.message : "Could not start Swish payment";

        return NextResponse.json({ error: message }, { status: 500 });
    }
}
