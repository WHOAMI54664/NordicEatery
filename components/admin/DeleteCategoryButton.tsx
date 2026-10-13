"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
const copy = {
  sv: {
    remove: "Ta bort kategori",
    title: "Ta bort",
    help: "Produkterna behålls. Välj en annan kategori om det finns produkter i kategorin.",
    move: "Flytta produkter till",
    empty: "Ingen flytt (tom kategori)",
    confirm: "Bekräfta borttagning",
    cancel: "Avbryt",
    saving: "Sparar…",
    failed: "Det gick inte att ta bort kategorin. Försök igen.",
    targetRequired: "Kategorin innehåller produkter. Välj vart de ska flyttas.",
    invalidTarget:
      "Den valda kategorin är inte längre tillgänglig. Uppdatera sidan.",
  },
  en: {
    remove: "Delete category",
    title: "Delete",
    help: "Products are kept. Choose another category if this category contains products.",
    move: "Move products to",
    empty: "No move (empty category)",
    confirm: "Confirm deletion",
    cancel: "Cancel",
    saving: "Saving…",
    failed: "Could not delete the category. Try again.",
    targetRequired: "This category contains products. Choose a destination.",
    invalidTarget:
      "The destination category is no longer available. Refresh the page.",
  },
  ru: {
    remove: "Удалить категорию",
    title: "Удалить",
    help: "Товары сохранятся. Если в категории есть товары, выберите, куда их перенести.",
    move: "Перенести товары в",
    empty: "Без переноса (пустая категория)",
    confirm: "Подтвердить удаление",
    cancel: "Отмена",
    saving: "Сохранение…",
    failed: "Не удалось удалить категорию. Попробуйте ещё раз.",
    targetRequired: "В категории есть товары. Выберите категорию для переноса.",
    invalidTarget: "Выбранная категория уже недоступна. Обновите страницу.",
  },
  pl: {
    remove: "Usuń kategorię",
    title: "Usuń",
    help: "Produkty zostaną zachowane. Wybierz inną kategorię, jeśli są w niej produkty.",
    move: "Przenieś produkty do",
    empty: "Bez przenoszenia (pusta kategoria)",
    confirm: "Potwierdź usunięcie",
    cancel: "Anuluj",
    saving: "Zapisywanie…",
    failed: "Nie udało się usunąć kategorii. Spróbuj ponownie.",
    targetRequired:
      "Ta kategoria zawiera produkty. Wybierz kategorię docelową.",
    invalidTarget: "Kategoria docelowa nie jest już dostępna. Odśwież stronę.",
  },
};
export function DeleteCategoryButton({
  category,
  categories,
  locale,
  onDeleted,
  iconOnly = false,
}: {
  category: { id: string; title: string };
  categories: { id: string; title: string }[];
  locale: string;
  onDeleted?: (target: string | null) => void;
  iconOnly?: boolean;
}) {
  const router = useRouter();
  const t = copy[locale as keyof typeof copy] || copy.en;
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false),
    [target, setTarget] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (!iconOnly || !open) return;
    const focused = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
      if (focused?.isConnected) focused.focus();
    };
  }, [iconOnly, open]);
  async function remove() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/menu/categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: category.id, target: target || null }),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(
          result.error === "targetRequired"
            ? t.targetRequired
            : result.error === "invalidTarget"
              ? t.invalidTarget
              : t.failed,
        );
        return;
      }
      onDeleted?.(target || null);
      setOpen(false);
      router.refresh();
    } catch {
      setError(t.failed);
    } finally {
      setBusy(false);
    }
  }
  const confirmation = (
    <section
      aria-label={`${t.title} ${category.title}`}
      className="space-y-3 rounded-2xl border border-red-200 bg-white p-4 text-sm"
    >
      <p className="font-bold">
        {t.title} «{category.title}»?
      </p>
      <p>{t.help}</p>
      <label className="block">
        {t.move}
        <select
          disabled={busy}
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          className="mt-1 block w-full rounded-xl border p-2"
        >
          <option value="">{t.empty}</option>
          {categories
            .filter((item) => item.id !== category.id)
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
        </select>
      </label>
      {error ? (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void remove()}
          className="rounded-xl bg-red-700 px-3 py-2 font-bold text-white disabled:opacity-50"
        >
          {busy ? t.saving : t.confirm}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setOpen(false)}
          className="rounded-xl border px-3 py-2"
        >
          {t.cancel}
        </button>
      </div>
    </section>
  );
  return (
    <div className={iconOnly ? "shrink-0" : "relative mt-3"}>
      {(!open || iconOnly) && (
        <button
          type="button"
          aria-label={`${t.remove}: ${category.title}`}
          title={`${t.remove}: ${category.title}`}
          onClick={() => {
            setOpen(true);
            setError("");
          }}
          className={
            iconOnly
              ? "flex h-11 w-11 items-center justify-center rounded-xl text-red-700 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-paprika"
              : "inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-bold text-red-700"
          }
        >
          <Trash2 size={17} aria-hidden="true" />
          {!iconOnly && t.remove}
        </button>
      )}
      {open &&
        (iconOnly
          ? createPortal(
              <dialog
                ref={dialog}
                aria-label={`${t.title} ${category.title}`}
                className="m-auto w-[min(480px,calc(100vw-32px))] max-w-none rounded-2xl bg-white p-0 text-dark shadow-2xl backdrop:bg-black/45"
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
                onCancel={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (!busy) setOpen(false);
                }}
              >
                {confirmation}
              </dialog>,
              document.body,
            )
          : confirmation)}
    </div>
  );
}
