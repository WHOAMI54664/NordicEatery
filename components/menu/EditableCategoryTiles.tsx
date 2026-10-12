"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  GripVertical,
  UtensilsCrossed,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getPublicPath } from "@/i18n/paths";
import type { MenuCategory } from "@/lib/menu-display";
import { EditableCopy } from "@/components/site-content/EditableCopy";

const copy = {
  sv: {
    moveLeft: "Flytta {title} åt vänster",
    moveRight: "Flytta {title} åt höger",
    drag: "Dra för att flytta {title}",
    saving: "Sparar ordningen…",
    saved: "Ordningen sparades.",
    failed: "Det gick inte att spara ordningen. Försök igen.",
    help: "Dra i handtaget eller använd pilarna för att ändra ordningen.",
  },
  en: {
    moveLeft: "Move {title} left",
    moveRight: "Move {title} right",
    drag: "Drag to move {title}",
    saving: "Saving order…",
    saved: "Order saved.",
    failed: "Could not save order. Try again.",
    help: "Drag the handle or use arrows to change the order.",
  },
  pl: {
    moveLeft: "Przenieś {title} w lewo",
    moveRight: "Przenieś {title} w prawo",
    drag: "Przeciągnij, aby przenieść {title}",
    saving: "Zapisywanie kolejności…",
    saved: "Zapisano kolejność.",
    failed: "Nie udało się zapisać kolejności. Spróbuj ponownie.",
    help: "Przeciągnij uchwyt lub użyj strzałek, aby zmienić kolejność.",
  },
  ru: {
    moveLeft: "Переместить {title} влево",
    moveRight: "Переместить {title} вправо",
    drag: "Перетащить плитку «{title}»",
    saving: "Сохраняю порядок…",
    saved: "Порядок сохранён.",
    failed: "Не удалось сохранить порядок. Попробуйте ещё раз.",
    help: "Перетащите плитку за ручку или используйте стрелки, чтобы изменить порядок.",
  },
} as const;

type Locale = keyof typeof copy;

export function EditableCategoryTiles({
  categories,
  locale,
  canEdit,
  ariaLabel,
}: {
  categories: MenuCategory[];
  locale: string;
  canEdit: boolean;
  ariaLabel: string;
}) {
  const router = useRouter();
  const [order, setOrder] = useState(() => categories.map((item) => item.id));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const labels = copy[locale as Locale] || copy.en;
  const categoriesById = useMemo(
    () => new Map(categories.map((item) => [item.id, item])),
    [categories],
  );
  const orderedCategories = order
    .map((id) => categoriesById.get(id))
    .filter((item): item is MenuCategory => Boolean(item));

  useEffect(() => {
    setOrder(categories.map((item) => item.id));
  }, [categories]);

  async function saveOrder(nextOrder: string[]) {
    if (!canEdit || saving) return;
    const previousOrder = order;
    setOrder(nextOrder);
    setSaving(true);
    setStatus(labels.saving);

    try {
      const response = await fetch("/api/admin/menu/categories/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: nextOrder }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error("order-save-failed");
      setStatus(labels.saved);
      router.refresh();
    } catch {
      setOrder(previousOrder);
      setStatus(labels.failed);
    } finally {
      setSaving(false);
    }
  }

  function moveBy(id: string, offset: number) {
    const from = order.indexOf(id);
    const to = from + offset;
    if (from < 0 || to < 0 || to >= order.length || saving) return;
    const next = [...order];
    [next[from], next[to]] = [next[to], next[from]];
    void saveOrder(next);
  }

  function dropOn(targetId: string, event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData("text/plain");
    const from = order.indexOf(sourceId);
    const to = order.indexOf(targetId);
    if (from < 0 || to < 0 || from === to || saving) return;
    const next = [...order];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    void saveOrder(next);
  }

  return (
    <div>
      <nav
        aria-label={ariaLabel}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4 pt-1"
      >
        {orderedCategories.map((category, index) => (
          <div
            key={category.id}
            onDragOver={(event) => {
              if (canEdit) event.preventDefault();
            }}
            onDrop={(event) => dropOn(category.id, event)}
            className="relative w-36 shrink-0 snap-start sm:w-40"
          >
            <Link
              href={
                getPublicPath(locale, "/menu") +
                "?category=" +
                encodeURIComponent(category.id) +
                "#menu-catalog"
              }
              className="glass-card group block overflow-hidden shadow-none transition hover:-translate-y-1 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paprika"
            >
              <div className="relative aspect-[4/3] bg-honey/15">
                {category.image ? (
                  <Image
                    src={category.image}
                    alt=""
                    fill
                    sizes="160px"
                    className={
                      category.hasCategoryImage
                        ? "object-cover"
                        : "object-contain p-2"
                    }
                    unoptimized
                  />
                ) : (
                  <span className="flex h-full items-center justify-center text-paprika/60">
                    <UtensilsCrossed size={32} />
                  </span>
                )}
              </div>
              <div className="px-3 py-4 text-center">
                <p className="font-black text-dark">
                  <EditableCopy
                    value={category.title}
                    textKey={category.textKey}
                    page="menu"
                  />
                </p>
              </div>
            </Link>

            {canEdit && (
              <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full bg-white/95 p-1 shadow">
                <button
                  type="button"
                  draggable={!saving}
                  disabled={saving}
                  aria-label={labels.drag.replace("{title}", category.title)}
                  title={labels.drag.replace("{title}", category.title)}
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/plain", category.id);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  className="flex h-7 w-7 cursor-grab items-center justify-center rounded-full text-dark hover:bg-dark/5 disabled:cursor-wait"
                >
                  <GripVertical size={15} />
                </button>
                <button
                  type="button"
                  aria-label={labels.moveLeft.replace(
                    "{title}",
                    category.title,
                  )}
                  title={labels.moveLeft.replace("{title}", category.title)}
                  disabled={saving || index === 0}
                  onClick={() => moveBy(category.id, -1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-dark hover:bg-dark/5 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  aria-label={labels.moveRight.replace(
                    "{title}",
                    category.title,
                  )}
                  title={labels.moveRight.replace("{title}", category.title)}
                  disabled={saving || index === orderedCategories.length - 1}
                  onClick={() => moveBy(category.id, 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-dark hover:bg-dark/5 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        ))}
      </nav>
      {canEdit && (
        <p
          role="status"
          aria-live="polite"
          className="mt-1 text-xs text-dark/55"
        >
          {status || labels.help}
        </p>
      )}
    </div>
  );
}
