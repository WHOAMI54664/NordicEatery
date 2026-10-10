import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GroupOrderRoom } from "@/components/group-orders/GroupOrderRoom";
import { UUID } from "@/lib/group-orders/model";
import type { Product } from "@/types/product";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "groupOrder" });
  return {
    title: t("groupOrder"),
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}
export const dynamic = "force-dynamic";
export default async function GroupOrderRoomPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!UUID.test(id)) notFound();
  const db = await createClient();
  const { data, error } = await db
    .from("products")
    .select(
      "id, name, name_sv, name_pl, name_ru, description, description_sv, description_pl, description_ru, subtitle, subtitle_sv, subtitle_pl, subtitle_ru, badge, price, category, menu_type, image_url, is_available, track_stock, stock_quantity",
    )
    .eq("is_available", true)
    .or("track_stock.eq.false,stock_quantity.gt.0")
    .order("sort_order")
    .limit(1000);
  const { data: content } = await db
    .from("site_content")
    .select("key,value")
    .eq("page", "menu")
    .eq("locale", locale);
  const { data: settings } = await db
    .from("business_settings")
    .select(
      "card_enabled, swish_enabled, cash_enabled, pickup_enabled, delivery_enabled",
    )
    .limit(1)
    .maybeSingle();
  return (
    <main className="container-page py-8 sm:py-12">
      <GroupOrderRoom
        id={id}
        locale={locale}
        products={(data || []) as Product[]}
        catalogError={Boolean(error)}
        menuContent={Object.fromEntries(
          (content || []).map((item) => [item.key, item.value]),
        )}
        settings={{
          card_enabled: settings?.card_enabled === true,
          swish_enabled: settings?.swish_enabled === true,
          cash_enabled: settings?.cash_enabled === true,
          pickup_enabled: settings?.pickup_enabled === true,
          delivery_enabled: settings?.delivery_enabled === true,
        }}
      />
    </main>
  );
}
