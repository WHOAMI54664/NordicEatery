import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { GroupError, record } from "./model";
import { groupCookie, groupDb, tokenHash } from "./store";

export function groupResponse(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
export function groupFailure(error: unknown) {
  if (error instanceof GroupError)
    return groupResponse({ error: error.code }, error.status);
  console.error("Group order request failed", {
    kind: error instanceof Error ? error.name : "unknown",
  });
  return groupResponse({ error: "unavailable" }, 503);
}
export async function groupBody(request: Request) {
  const origin = request.headers.get("origin");
  const canonical = new URL(process.env.NEXT_PUBLIC_SITE_URL || request.url)
    .origin;
  // Next's development server normalizes request.url to localhost even when the
  // browser uses 127.0.0.1. Production mutations require the configured origin.
  const localOrigin =
    process.env.NODE_ENV !== "production" &&
    origin &&
    (origin === new URL(request.url).origin ||
      ["localhost", "127.0.0.1"].some(
        (host) =>
          origin === `http://${request.headers.get("host")}` &&
          request.headers.get("host")?.split(":")[0] === host,
      ));
  if (origin !== canonical && !localOrigin)
    throw new GroupError("forbidden", 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new GroupError("invalidInput");
  const body = await request.text();
  if (body.length > 20000) throw new GroupError("invalidInput", 413);
  try {
    return record(JSON.parse(body));
  } catch {
    throw new GroupError("invalidInput");
  }
}
export async function memberHash(id: string) {
  const token = (await cookies()).get(groupCookie(id))?.value;
  return token && /^[a-f0-9]{64}$/.test(token) ? tokenHash(token) : "";
}
export function setMemberCookie(
  response: NextResponse,
  id: string,
  token: string,
) {
  response.cookies.set(groupCookie(id), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/api/group-orders/${id}`,
    maxAge: 7 * 24 * 60 * 60,
  });
}
export async function groupWorkerReady() {
  const secret = process.env.CRON_SECRET;
  if (secret) return secret.length >= 32;
  const { data, error } = await groupDb().rpc("group_order_worker_ready");
  return !error && data === true;
}

export async function validWorkerSecret(request: Request) {
  const secret = process.env.CRON_SECRET;
  const value = request.headers.get("authorization") || "";
  // Production uses a scoped Vault secret, following the opening-email worker.
  // It never needs to be exported to a developer machine or Vercel configuration.
  if (!secret) {
    if (!/^Bearer [a-f0-9]{64}$/.test(value)) return false;
    const { data, error } = await groupDb().rpc(
      "authorize_group_order_worker",
      {
        p_token: value.slice(7),
      },
    );
    return !error && data === true;
  }
  const expected = `Bearer ${secret || ""}`;
  const providedBytes = Buffer.from(value);
  const expectedBytes = Buffer.from(expected);
  return Boolean(
    secret &&
    secret.length >= 32 &&
    providedBytes.length === expectedBytes.length &&
    timingSafeEqual(providedBytes, expectedBytes),
  );
}

export const reservationCookie = "ne_group_slot_reservation";
export async function readReservationToken() {
  const token = (await cookies()).get(reservationCookie)?.value;
  return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
}
export function setReservationCookie(
  response: NextResponse,
  token: string,
  clear = false,
) {
  response.cookies.set(reservationCookie, clear ? "" : token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/group-orders",
    maxAge: clear ? 0 : 24 * 60 * 60,
  });
}
