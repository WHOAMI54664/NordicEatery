"use client";

import { useEffect, useState } from "react";
import { Check, Pencil, X } from "lucide-react";

type EditableTextProps = {
    value: string;
    textKey: string;
    locale: string;
    page: string;
    canEdit?: boolean;
    className?: string;
    as?: "span" | "p" | "h1" | "h2" | "h3";
};

export function EditableText({
                                 value,
                                 textKey,
                                 locale,
                                 page,
                                 canEdit = false,
                                 className = "",
                                 as = "span",
                             }: EditableTextProps) {
    const [text, setText] = useState(value);
    const [draft, setDraft] = useState(value);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    const Tag = as;

    useEffect(() => {
        setText(value);
        setDraft(value);
    }, [value]);

    async function save() {
        setSaving(true);

        const response = await fetch("/api/admin/site-content", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: textKey, value: draft, locale, page }),
        });

        setSaving(false);

        if (!response.ok) {
            alert("Could not save text");
            return;
        }

        setText(draft);
        setEditing(false);
    }

    if (!canEdit) {
        return <Tag className={className}>{text}</Tag>;
    }

    return (
        <span className="group relative inline-flex max-w-full items-center gap-1 align-baseline">
      {editing ? (
          <span className="block w-[420px] max-w-[90vw] rounded-2xl border border-paprika/30 bg-white p-3 text-base font-normal leading-normal tracking-normal text-dark shadow-lg">
          <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={4}
              className="block min-h-[120px] w-full resize-none rounded-xl border border-dark/10 bg-white p-4 text-base font-normal leading-6 tracking-normal text-dark outline-none focus:border-paprika"
          />

          <span className="mt-3 flex gap-2 text-xs font-normal tracking-normal">
            <button
                type="button"
                onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    save();
                }}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-paprika px-4 py-2 text-xs font-black tracking-normal text-white disabled:opacity-60"
            >
              <Check size={14} />
                {saving ? "Saving..." : "Save"}
            </button>

            <button
                type="button"
                onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setDraft(text);
                    setEditing(false);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-dark/5 px-4 py-2 text-xs font-black tracking-normal text-dark"
            >
              <X size={14} />
              Cancel
            </button>
          </span>
        </span>
      ) : (
          <>
              <Tag className={className}>{text}</Tag>

              <button
                  type="button"
                  onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setEditing(true);
                  }}
                  className="hidden shrink-0 rounded-full bg-white p-1.5 text-paprika shadow-md ring-1 ring-dark/10 transition hover:bg-paprika hover:text-white group-hover:inline-flex"
                  aria-label="Edit text"
              >
                  <Pencil size={13} />
              </button>
          </>
      )}
    </span>
    );
}