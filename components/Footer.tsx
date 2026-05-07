import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { FooterClient } from "@/components/FooterClient";

export async function Footer() {
  noStore();

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

  const { data: businessSettings } = await supabase
      .from("business_settings")
      .select(
          `
      business_name,
      brand_name,
      organization_number,
      vat_number,
      support_email,
      booking_email,
      phone,
      location,
      address
    `
      )
      .limit(1)
      .single();

  return (
      <FooterClient
          canEdit={canEdit}
          editableContent={editableContent}
          businessSettings={businessSettings || null}
      />
  );
}
