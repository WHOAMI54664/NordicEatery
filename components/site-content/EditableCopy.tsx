"use client";
import { useLocale } from "next-intl";
import { EditableText } from "@/components/EditableText";
import { useSiteContent } from "./SiteContentProvider";

// Existing CMS keys and static copy share storage without changing catalog or
// order data. Values from customers and calculated prices never use this wrapper.
export function EditableCopy({
  value,
  textKey,
  page,
}: {
  value: string;
  textKey: string;
  page: string;
}) {
  const { canEdit, content } = useSiteContent();
  const locale = useLocale();
  return (
    <EditableText
      value={content[textKey] ?? value}
      textKey={textKey}
      locale={locale}
      page={page}
      canEdit={canEdit}
    />
  );
}
