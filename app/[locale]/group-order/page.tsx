import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { groupSwishEnabled } from "@/lib/group-orders/swish";
import { GroupOrderStart } from "@/components/group-orders/GroupOrderStart";
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
export default async function GroupOrderPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const db = await createClient();
  const { data: settings } = await db
    .from("business_settings")
    .select(
      "card_enabled, swish_enabled, cash_enabled, pickup_enabled, delivery_enabled",
    )
    .limit(1)
    .maybeSingle();
  return (
    <main className="container-page py-10 sm:py-16">
      <GroupOrderStart
        locale={locale}
        settings={{
          card_enabled: settings?.card_enabled === true,
          swish_enabled:
            settings?.swish_enabled === true && groupSwishEnabled(),
          cash_enabled: settings?.cash_enabled === true,
          pickup_enabled: settings?.pickup_enabled === true,
          delivery_enabled: settings?.delivery_enabled === true,
        }}
        enabled={process.env.GROUP_ORDERS_ENABLED === "true"}
      />
    </main>
  );
}
