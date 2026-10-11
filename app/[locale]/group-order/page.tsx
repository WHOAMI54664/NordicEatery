import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
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
  return (
    <main className="container-page py-10 sm:py-16">
      <GroupOrderStart
        locale={locale}
        enabled={process.env.GROUP_ORDERS_ENABLED === "true"}
      />
    </main>
  );
}
