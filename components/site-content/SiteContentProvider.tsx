"use client";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { NextIntlClientProvider } from "next-intl";
import { mergeCopy, type MessageTree } from "@/lib/site-content/messages";

const ContentContext = createContext({
  canEdit: false,
  content: {} as Record<string, string>,
  changes: {} as Record<string, string>,
  setCopy: (_key: string, _value: string) => {},
});
export const useSiteContent = () => useContext(ContentContext);

export function SiteContentProvider({
  locale,
  messages,
  canEdit,
  content,
  children,
}: {
  locale: string;
  messages: MessageTree;
  canEdit: boolean;
  content: Record<string, string>;
  children: ReactNode;
}) {
  const [changes, setChanges] = useState<Record<string, string>>({});
  useEffect(() => setChanges({}), [locale, messages]);
  const context = useMemo(
    () => ({
      canEdit,
      content,
      changes,
      setCopy: (key: string, value: string) =>
        setChanges((current) => ({ ...current, [key]: value })),
    }),
    [canEdit, content, changes],
  );
  const currentMessages = useMemo(
    () =>
      mergeCopy(
        messages,
        Object.entries(changes).map(([key, value]) => ({ key, value })),
      ),
    [messages, changes],
  );
  return (
    <ContentContext.Provider value={context}>
      <NextIntlClientProvider
        locale={locale}
        messages={currentMessages}
        timeZone="Europe/Stockholm"
      >
        {children}
      </NextIntlClientProvider>
    </ContentContext.Provider>
  );
}
