import { sendZReportEmail } from "@/lib/reports/send-z-reports";
import { sendOpeningEmails } from "@/lib/notifications/send-opening-emails";
import { after, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { addressForCoordinates } from "@/lib/restaurant/geocoding";
import { completeShiftLocation } from "@/lib/restaurant/location-update";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { canManageOrders } from "@/lib/auth/roles";
import {
  parseCoordinates,
  parseShiftUpdate,
  shiftUpdatePayload,
} from "@/lib/restaurant/location";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const fields =
  "id, is_open, opened_at, closed_at, updated_at, location_address, location_latitude, location_longitude";

async function authorizeManager() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (error)
    return {
      response: NextResponse.json(
        { error: "Could not verify user role" },
        { status: 503 },
      ),
    };
  if (!canManageOrders(profile?.role))
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  return { userId: user.id };
}

function responseShift(data: {
  is_open: boolean | null;
  opened_at: string | null;
  closed_at: string | null;
  updated_at: string | null;
  location_address: string | null;
  location_latitude: number | null;
  location_longitude: number | null;
}) {
  return {
    isOpen: Boolean(data.is_open),
    openedAt: data.opened_at || null,
    closedAt: data.closed_at || null,
    updatedAt: data.updated_at || null,
    locationAddress: data.location_address || null,
    coordinates:
      data.location_latitude == null && data.location_longitude == null
        ? null
        : parseCoordinates({
            latitude: data.location_latitude,
            longitude: data.location_longitude,
          }),
  };
}

export async function GET() {
  try {
    const access = await authorizeManager();
    if (access.response) return access.response;
    const { data, error } = await createAdminClient({ timeoutMs: 10000 })
      .from("restaurant_shift_state")
      .select(fields)
      .eq("id", 1)
      .maybeSingle();
    if (error || !data) {
      console.error("Shift state fetch failed", {
        code: error?.code || "missing_shift",
      });
      return NextResponse.json(
        { error: "Could not load shift state" },
        { status: 503 },
      );
    }
    return NextResponse.json({ success: true, shift: responseShift(data) });
  } catch {
    console.error("Shift state fetch failed");
    return NextResponse.json(
      { error: "Could not load shift state" },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    const allowedOrigins = [
      new URL(request.url).origin,
      new URL(process.env.NEXT_PUBLIC_SITE_URL || request.url).origin,
    ];
    if (
      (origin && !allowedOrigins.includes(origin)) ||
      !request.headers.get("content-type")?.includes("application/json")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const access = await authorizeManager();
    if (access.response) return access.response;
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "invalidInput" }, { status: 400 });
    }
    if (body?.action === "resolve-location") {
      let coordinates;
      try {
        coordinates = parseCoordinates(body.coordinates);
      } catch {
        return NextResponse.json(
          { error: "invalidCoordinates" },
          { status: 400 },
        );
      }
      if (!coordinates)
        return NextResponse.json(
          { error: "invalidCoordinates" },
          { status: 400 },
        );
      const limit = rateLimit(
        `truck-geocoding:${access.userId}`,
        request,
        10,
        60000,
      );
      if (!limit.ok) return rateLimitResponse(limit.retryAfter);
      try {
        return NextResponse.json(
          { address: await addressForCoordinates(coordinates) },
          { headers: { "Cache-Control": "no-store" } },
        );
      } catch {
        return NextResponse.json(
          { error: "geocodingUnavailable" },
          { status: 503 },
        );
      }
    }
    let update;
    try {
      update = parseShiftUpdate(body);
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error &&
            [
              "invalidInput",
              "invalidAddress",
              "invalidCoordinates",
              "locationRequired",
            ].includes(error.message)
              ? error.message
              : "invalidInput",
        },
        { status: 400 },
      );
    }
    if (update.action !== "close" && update.coordinates) {
      const { data: current, error: readError } = await createAdminClient({
        timeoutMs: 10000,
      })
        .from("restaurant_shift_state")
        .select(fields)
        .eq("id", 1)
        .maybeSingle();
      if (readError || !current)
        return NextResponse.json(
          { error: "Could not load shift state" },
          { status: 503 },
        );
      try {
        const previous = responseShift(current);
        update = await completeShiftLocation(
          update,
          {
            address: previous.locationAddress,
            coordinates: previous.coordinates,
          },
          async (coordinates) => {
            const limit = rateLimit(
              `truck-geocoding:${access.userId}`,
              request,
              10,
              60000,
            );
            if (!limit.ok) throw new Error("geocodingUnavailable");
            return addressForCoordinates(coordinates);
          },
        );
      } catch {
        return NextResponse.json(
          { error: "geocodingUnavailable" },
          { status: 503 },
        );
      }
    }
    const payload = shiftUpdatePayload(
      update,
      access.userId!,
      new Date().toISOString(),
    );
    const { data, error } = await createAdminClient({ timeoutMs: 10000 })
      .from("restaurant_shift_state")
      .update(payload)
      .eq("id", 1)
      .select(fields)
      .maybeSingle();
    if (error || !data) {
      // Never retry an open operation without its address/coordinates.
      console.error("Shift update failed", {
        code: error?.code || "missing_shift",
      });
      return NextResponse.json(
        { error: "Could not save shift. Please try again." },
        { status: 503 },
      );
    }
    if (update.action === "open" && data.is_open) {
      after(async () => {
        try {
          await sendOpeningEmails();
        } catch {
          console.error("Opening email processing needs retry");
        }
      });
    }
    if (update.action === "close" && !data.is_open) {
      after(async () => {
        try {
          await sendZReportEmail();
        } catch {
          console.error("Z-report delivery needs retry");
        }
      });
    }
    return NextResponse.json({ success: true, shift: responseShift(data) });
  } catch {
    console.error("Shift update failed");
    return NextResponse.json(
      { error: "Could not update shift state" },
      { status: 503 },
    );
  }
}
