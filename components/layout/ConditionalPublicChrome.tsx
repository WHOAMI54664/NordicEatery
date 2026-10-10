"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

type ConditionalPublicChromeProps = {
  locale: string;
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
};

export function ConditionalPublicChrome({
  locale,
  header,
  footer,
  children,
}: ConditionalPublicChromeProps) {
  const pathname = usePathname() || "";

  const adminBasePath = `/${locale}/admin`;

  const isAdminRoute =
    pathname === adminBasePath || pathname.startsWith(`${adminBasePath}/`);

  return (
    <>
      {!isAdminRoute ? header : null}

      {children}

      {!isAdminRoute ? footer : null}
    </>
  );
}
