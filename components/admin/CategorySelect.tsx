"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Pencil, Plus } from "lucide-react";
import { TextEditor } from "@/components/EditableText";
import { DeleteCategoryButton } from "@/components/admin/DeleteCategoryButton";
import type { MenuCategory } from "@/lib/menu-display";

const newCategoryLabels: Record<string, string> = {
  sv: "Ny kategori…",
  en: "New category…",
  ru: "Новая категория…",
  pl: "Nowa kategoria…",
};

export function CategorySelect({
  categories,
  value,
  adding,
  label,
  editLabel,
  locale,
  canEdit,
  onChange,
  onAdd,
  onRenamed,
  onDeleted,
}: {
  categories: MenuCategory[];
  value: string;
  adding: boolean;
  label: string;
  editLabel: string;
  locale: string;
  canEdit: boolean;
  onChange: (id: string) => void;
  onAdd: () => void;
  onRenamed: (key: string, title: string) => void;
  onDeleted: (id: string, target: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MenuCategory | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  const newLabel = newCategoryLabels[locale] || newCategoryLabels.en;
  const selected = categories.find((category) => category.id === value);

  useEffect(() => {
    if (!open) return;
    (
      panel.current?.querySelector<HTMLElement>('[data-selected="true"]') ||
      panel.current?.querySelector<HTMLElement>("[data-category-choice]")
    )?.focus();
    const outside = (event: PointerEvent) => {
      // Rename/delete dialogs are portals and must keep their parent row mounted.
      if (document.querySelector("dialog[open]")) return;
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  return (
    <div
      ref={root}
      className="relative"
      onBlur={(event) => {
        if (
          event.relatedTarget &&
          !event.currentTarget.contains(event.relatedTarget) &&
          !document.querySelector("dialog[open]")
        )
          setOpen(false);
      }}
    >
      <button
        type="button"
        ref={trigger}
        aria-label={`${label}: ${adding ? newLabel : selected?.title || label}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-[#EADDCF] bg-white/75 px-4 py-3 text-left text-sm font-semibold text-[#25120F] shadow-inner shadow-[#4C2314]/5 outline-none focus-visible:border-[#E51B23]/25 focus-visible:ring-4 focus-visible:ring-[#E51B23]/8"
      >
        <span className="min-w-0 break-words">
          {adding ? newLabel : selected?.title || label}
        </span>
        <ChevronDown size={18} aria-hidden="true" className="shrink-0" />
      </button>
      {open && (
        <div
          ref={panel}
          id={id}
          role="dialog"
          aria-label={label}
          className="absolute left-0 right-0 z-40 mt-2 max-h-[min(22rem,50vh)] overflow-y-auto rounded-2xl border border-[#EADDCF] bg-white p-1.5 text-sm text-[#25120F] shadow-xl"
          onKeyDown={(event) => {
            if (
              event.key === "Escape" &&
              !document.querySelector("dialog[open]")
            ) {
              event.preventDefault();
              event.stopPropagation();
              close();
            }
            if (
              !(event.target instanceof HTMLElement) ||
              !event.target.hasAttribute("data-category-choice")
            )
              return;
            const keys = ["ArrowDown", "ArrowUp", "Home", "End"];
            if (!keys.includes(event.key)) return;
            event.preventDefault();
            const choices = Array.from(
              event.currentTarget.querySelectorAll<HTMLButtonElement>(
                "[data-category-choice]",
              ),
            );
            const current = choices.indexOf(event.target as HTMLButtonElement);
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? choices.length - 1
                  : (current +
                      (event.key === "ArrowDown" ? 1 : -1) +
                      choices.length) %
                    choices.length;
            choices[next]?.focus();
          }}
        >
          <ul className="space-y-0.5">
            {categories.map((category) => (
              <li
                key={category.id}
                className={`flex items-center gap-0.5 rounded-xl ${!adding && category.id === value ? "bg-[#FFF0E8]" : "hover:bg-[#FFF8F1]"}`}
              >
                <button
                  type="button"
                  data-category-choice
                  data-selected={!adding && category.id === value}
                  aria-pressed={!adding && category.id === value}
                  onClick={() => {
                    onChange(category.id);
                    close();
                  }}
                  className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl px-3 py-2 text-left font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-paprika"
                >
                  <Check
                    size={16}
                    aria-hidden="true"
                    className={`shrink-0 text-paprika ${!adding && category.id === value ? "" : "invisible"}`}
                  />
                  <span className="break-words">{category.title}</span>
                </button>
                {canEdit && (
                  <>
                    <button
                      type="button"
                      aria-label={`${editLabel}: ${category.title}`}
                      title={`${editLabel}: ${category.title}`}
                      onClick={() => setEditing(category)}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-paprika hover:bg-[#FFF0E8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-paprika"
                    >
                      <Pencil size={17} aria-hidden="true" />
                    </button>
                    <DeleteCategoryButton
                      iconOnly
                      category={category}
                      categories={categories}
                      locale={locale}
                      onDeleted={(target) => {
                        onDeleted(category.id, target);
                        trigger.current?.focus();
                      }}
                    />
                  </>
                )}
              </li>
            ))}
          </ul>
          <button
            type="button"
            data-category-choice
            data-selected={adding}
            onClick={() => {
              close();
              onAdd();
            }}
            className="mt-1 flex min-h-11 w-full items-center gap-2 rounded-xl border-t border-[#EADDCF] px-3 py-2 text-left font-bold text-paprika hover:bg-[#FFF0E8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-paprika"
          >
            <Plus size={16} aria-hidden="true" />
            {newLabel}
          </button>
        </div>
      )}
      {editing && (
        <TextEditor
          value={editing.title}
          textKey={editing.textKey}
          locale={locale}
          page="menu"
          onClose={() => setEditing(null)}
          onSave={(title) => {
            onRenamed(editing.textKey, title);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
