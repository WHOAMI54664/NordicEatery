import { defineRouting } from "next-intl/routing";
import { publicLocales, publicPathnames } from "./paths";

export const routing = defineRouting({
  locales: publicLocales,
  defaultLocale: "en",
  pathnames: publicPathnames,
});
