import { canEditSiteContent, loadSiteContent } from "@/lib/site-content/server";
import { getLocale } from "next-intl/server";
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { FooterClient } from "@/components/FooterClient";

export async function Footer() {
  noStore();

  const locale = await getLocale();
  const supabase = await createClient();

  const [canEdit, siteContent] = await Promise.all([
    canEditSiteContent(),
    loadSiteContent(locale),
  ]);
  const editableContent = Object.fromEntries(
    siteContent
      .filter((row) => row.page === "footer")
      .map((row) => [row.key, row.value]),
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
    `,
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
