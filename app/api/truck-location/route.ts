import { NextResponse } from "next/server";
import { getPublicShiftStatus } from "@/lib/restaurant/public-shift";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const shift = await getPublicShiftStatus();
    return NextResponse.json(
      {
        isOpen: shift.isOpen,
        address: shift.isOpen ? shift.locationAddress : null,
        coordinates: shift.isOpen ? shift.coordinates : null,
        approximate: false,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Location unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
