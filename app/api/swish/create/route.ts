import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const response = await fetch(`${process.env.SWISH_BACKEND_URL}/swish/create`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-internal-secret": process.env.SWISH_INTERNAL_SECRET || "",
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { error: data.error || "Swish payment failed", details: data.details },
                { status: response.status }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Swish proxy error:", error);

        return NextResponse.json(
            { error: "Could not start Swish payment" },
            { status: 500 }
        );
    }
}