import { createClient } from "@supabase/supabase-js";

export function createAdminClient(options?: { timeoutMs?: number }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing");
  }

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    ...(options?.timeoutMs ? {
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, {
          ...init,
          signal: init?.signal
            ? AbortSignal.any([init.signal, AbortSignal.timeout(options.timeoutMs!)])
            : AbortSignal.timeout(options.timeoutMs!),
        }),
      },
    } : {}),
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
