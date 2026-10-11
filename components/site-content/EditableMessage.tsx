"use client";
import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { EditableText } from "@/components/EditableText";
import { COPY_PREFIX } from "@/lib/site-content/messages";
import { useSiteContent } from "./SiteContentProvider";

type MessageArguments = Parameters<ReturnType<typeof useTranslations>>;

export function EditableMessage({
  namespace,
  messageKey,
  values,
  formats,
  pencilOnly,
}: {
  namespace?: string;
  messageKey: string;
  pencilOnly?: boolean;
  values?: MessageArguments[1];
  formats?: MessageArguments[2];
}) {
  const t = useTranslations(namespace);
  const locale = useLocale();
  const { canEdit, setCopy } = useSiteContent();
  const key = COPY_PREFIX + (namespace ? `${namespace}.` : "") + messageKey;
  return (
    <EditableText
      pencilOnly={pencilOnly}
      value={t(messageKey, values, formats)}
      editValue={t.raw(messageKey)}
      textKey={key}
      locale={locale}
      page="translations"
      canEdit={canEdit}
      onSaved={(value) => setCopy(key, value)}
    />
  );
}

// Plain t(...) remains a string for attributes, validation and API payloads.
// t.edit(...) is only used in visible JSX text, never inside native options.
export function useEditableTranslations(namespace?: string) {
  const translate = useTranslations(namespace);
  return useMemo(
    () =>
      Object.assign(
        (...args: MessageArguments) => translate(...args),
        translate,
        {
          edit: (
            key: string,
            values?: MessageArguments[1],
            formats?: MessageArguments[2],
          ) => (
            <EditableMessage
              namespace={namespace}
              messageKey={key}
              values={values}
              formats={formats}
            />
          ),
        },
      ),
    [translate, namespace],
  );
}
