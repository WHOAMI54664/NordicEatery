import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  COPY_PREFIX,
  messageAt,
  mergeCopy,
  type MessageTree,
} from "./messages";
import { validMessage } from "./validation";

export const loadSiteContent = cache(async (locale: string) => {
  try {
    const db = await createClient();
    const { data, error } = await db
      .from("site_content")
      .select("key,value,page")
      .eq("locale", locale)
      .abortSignal(AbortSignal.timeout(4000));
    if (error) throw error;
    return data || [];
  } catch {
    console.error("Site copy unavailable; using translations");
    return [];
  }
});

export const canEditSiteContent = cache(async () => {
  try {
    const db = await createClient();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) return false;
    const { data } = await db
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .abortSignal(AbortSignal.timeout(4000))
      .single();
    return data?.role === "owner" || data?.role === "admin";
  } catch {
    return false;
  }
});

export async function loadCopyMessages(locale: string, messages: MessageTree) {
  const rows = await loadSiteContent(locale);
  return mergeCopy(
    messages,
    rows.filter((row) => {
      if (!row.key.startsWith(COPY_PREFIX)) return false;
      const template = messageAt(messages, row.key.slice(COPY_PREFIX.length));
      return (
        template !== undefined &&
        typeof row.value === "string" &&
        validMessage(template, row.value)
      );
    }),
  );
}
