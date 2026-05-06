import { createClient } from "@/lib/supabase/server";
import { getLocale } from "next-intl/server";
import { HeaderClient } from "@/components/HeaderClient";

export async function Header() {
  const locale = await getLocale();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let canEdit = false;

  if (user) {
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    canEdit = profile?.role === "owner" || profile?.role === "admin";
  }

  const { data: siteContent } = await supabase
      .from("site_content")
      .select("key,value")
      .eq("locale", locale)
      .eq("page", "header");

  const editableContent = Object.fromEntries(
      (siteContent || []).map((item) => [item.key, item.value])
  );

  return (
      <HeaderClient
          locale={locale}
          canEdit={canEdit}
          editableContent={editableContent}
      />
  );
}