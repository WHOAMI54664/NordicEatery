import { getRequestConfig } from "next-intl/server";
import { loadCopyMessages } from "@/lib/site-content/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    timeZone: "Europe/Stockholm",
    messages: await loadCopyMessages(locale, {
      ...(await import(`../messages/${locale}.json`)).default,
      groupOrder: (await import(`../messages/group-orders/${locale}.json`)).default,
    }),
  };
});
