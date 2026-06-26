import { createClient } from "@/lib/supabase/server";

/**
 * Authorization guard for API route handlers.
 *
 * Verifies that the request comes from an authenticated staff user whose role
 * is in `allowedRoles`. Use at the top of any privileged route that talks to
 * the database through the service-role admin client.
 */

export type GuardResult =
  | { ok: true; userId: string; role: string }
  | { ok: false; error: string; status: number };

export async function requireRole(
  allowedRoles: readonly string[]
): Promise<GuardResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Unauthorized", status: 401 };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = (profile?.role || "").toLowerCase();

  if (!allowedRoles.includes(role)) {
    return { ok: false, error: "Forbidden", status: 403 };
  }

  return { ok: true, userId: user.id, role };
}
