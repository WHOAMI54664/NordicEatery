"use client";

import { useEffect, useId, useRef, useState, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";
import { useSiteContent } from "@/components/site-content/SiteContentProvider";
import { EditPencil } from "@/components/site-content/EditPencil";
import { editorLabels } from "@/components/site-content/editor-labels";

type EditableTextProps = {
  value: string;
  textKey: string;
  locale: string;
  page: string;
  canEdit?: boolean;
  className?: string;
  as?: "span" | "p" | "h1" | "h2" | "h3";
  editValue?: string;
  pencilOnly?: boolean;
  onSaved?: (value: string) => void;
};

function TextEditor({
  value,
  textKey,
  locale,
  page,
  onClose,
  onSave,
}: {
  value: string;
  textKey: string;
  locale: string;
  page: string;
  onClose: () => void;
  onSave: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const request = useRef<AbortController | null>(null);
  const id = useId();
  const labels = editorLabels(locale);
  useEffect(() => {
    const element = dialog.current;
    const focused = document.activeElement as HTMLElement | null;
    element?.showModal();
    element?.querySelector("textarea")?.focus();
    return () => {
      request.current?.abort();
      element?.close();
      focused?.focus();
    };
  }, []);
  async function save() {
    if (!draft.trim() || saving) return;
    setSaving(true);
    setError("");
    const controller = new AbortController();
    request.current = controller;
    try {
      const response = await fetch("/api/admin/site-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: textKey, value: draft, locale, page }),
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(10000),
        ]),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(
          response.status === 401 || response.status === 403
            ? labels.forbidden
            : body?.error === "invalidTemplate"
              ? labels.invalid
              : labels.error,
        );
        return;
      }
      onSave(draft);
    } catch {
      if (!controller.signal.aborted) setError(labels.error);
    } finally {
      if (!controller.signal.aborted) setSaving(false);
    }
  }
  const isolate = (event: SyntheticEvent) => event.stopPropagation();
  // React portal events still bubble through the React tree. Isolate the entire
  // editor, not just Save/Cancel, to protect parent links, selections and forms.
  return createPortal(
    <dialog
      ref={dialog}
      aria-labelledby={`${id}-title`}
      className="inline-text-editor m-auto w-[min(560px,calc(100vw-32px))] max-w-none rounded-3xl border border-dark/10 bg-cream p-6 text-base font-normal leading-normal tracking-normal text-dark shadow-2xl backdrop:bg-black/45"
      onClick={isolate}
      onPointerDown={isolate}
      onPointerUp={isolate}
      onKeyDown={isolate}
      onKeyUp={isolate}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!saving) onClose();
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id={`${id}-title`} className="text-xl font-black">
          {labels.edit}
        </h2>
        <button
          type="button"
          aria-label={labels.cancel}
          disabled={saving}
          onClick={onClose}
          className="rounded-full p-2 hover:bg-dark/5"
        >
          <X size={20} />
        </button>
      </div>
      <label
        htmlFor={`${id}-text`}
        className="mb-2 mt-5 block text-sm font-bold"
      >
        {labels.text}
      </label>
      <textarea
        autoFocus
        id={`${id}-text`}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        maxLength={8000}
        rows={5}
        disabled={saving}
        className="w-full rounded-xl border border-dark/20 bg-white p-3 text-base leading-6 focus:border-paprika focus:outline-none"
        aria-describedby={`${id}-hint`}
      />
      <p id={`${id}-hint`} className="mt-2 text-xs leading-5 text-dark/60">
        {labels.hint}
      </p>
      {error && (
        <p role="alert" className="mt-3 text-sm font-bold text-paprika">
          {error}
        </p>
      )}
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || !draft.trim()}
          className="btn-primary gap-2 disabled:opacity-50"
        >
          <Check size={16} />
          {saving ? labels.saving : labels.save}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="btn-secondary"
        >
          {labels.cancel}
        </button>
      </div>
    </dialog>,
    document.body,
  );
}

export function EditableText({
  value,
  textKey,
  locale,
  page,
  canEdit = false,
  className = "",
  as: Tag = "span",
  editValue,
  pencilOnly = false,
  onSaved,
}: EditableTextProps) {
  const { changes, setCopy } = useSiteContent();
  const [text, setText] = useState(value);
  const shown = editValue === undefined ? (changes[textKey] ?? text) : text;
  const [editing, setEditing] = useState(false);
  useEffect(() => setText(value), [value]);
  return (
    <>
      <Tag className={className}>
        {!pencilOnly && (
          <span className="whitespace-pre-wrap break-words">{shown}</span>
        )}
        {canEdit && (
          <EditPencil
            label={`${editorLabels(locale).edit}: ${shown}`}
            textKey={textKey}
            onEdit={() => setEditing(true)}
          />
        )}
      </Tag>
      {canEdit && editing && (
        <TextEditor
          value={editValue ?? shown}
          textKey={textKey}
          locale={locale}
          page={page}
          onClose={() => setEditing(false)}
          onSave={(draft) => {
            if (onSaved) onSaved(draft);
            else {
              setText(draft);
              setCopy(textKey, draft);
            }
            setEditing(false);
          }}
        />
      )}
    </>
  );
}
