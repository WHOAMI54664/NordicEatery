import { createClient } from "@/lib/supabase/server";
import { FooterClient } from "@/components/FooterClient";

export async function Footer() {
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
      .eq("page", "footer");

  const editableContent = Object.fromEntries(
      (siteContent || []).map((item) => [item.key, item.value])
  );

  return <FooterClient canEdit={canEdit} editableContent={editableContent} />;
}