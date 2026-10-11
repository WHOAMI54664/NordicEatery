import { canEditSiteContent, loadSiteContent } from "@/lib/site-content/server";
import { getLocale } from "next-intl/server";
import { HeaderClient } from "@/components/HeaderClient";

export async function Header() {
  const locale = await getLocale();

  const [canEdit, siteContent] = await Promise.all([
    canEditSiteContent(),
    loadSiteContent(locale),
  ]);
  const editableContent = Object.fromEntries(
    siteContent
      .filter((row) => row.page === "header")
      .map((row) => [row.key, row.value]),
  );

  return (
    <HeaderClient
      locale={locale}
      canEdit={canEdit}
      editableContent={editableContent}
    />
  );
}
