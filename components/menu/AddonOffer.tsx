"use client";
import Image from "next/image";
import { ArrowLeft, Check, GlassWater, Soup, Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useEditableTranslations } from "@/components/site-content/EditableMessage";
import type { Product } from "@/types/product";
import { COMBO_DISCOUNT } from "@/lib/meal-combo";
import type { AddonKind } from "@/lib/menu-offers";
import {
  parseModifierGroups,
  productUnitAmount,
  resolveSelection,
  type Selection,
} from "@/lib/menu-options";
import { ModifierChoices } from "./ModifierChoices";

export type AddonChoice = { product: Product; remaining: number };
export type SelectedAddon = {
  product: Product;
  quantity: number;
  selections: Selection[];
};

export function AddonOffer({
  choices,
  kind,
  locale,
  titleId,
  mealQuantity,
  mealAmount,
  disabled,
  onBack,
  onAdd,
}: {
  choices: AddonChoice[];
  kind: AddonKind;
  locale: string;
  titleId: string;
  mealQuantity: number;
  mealAmount: number;
  disabled: boolean;
  onBack: () => void;
  onAdd: (addon?: SelectedAddon) => void;
}) {
  const t = useEditableTranslations(kind === "drink" ? "combo" : "sauceOffer");
  const discount = kind === "drink" ? COMBO_DISCOUNT : 0;
  const c = useEditableTranslations("customization");
  const p = useEditableTranslations("productCard");
  const heading = useRef<HTMLHeadingElement>(null);
  const [selectedId, setSelectedId] = useState("");
  const [selections, setSelections] = useState<Selection[]>([]);
  const [requestedQuantity, setQuantity] = useState(mealQuantity);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const selected = choices.find((choice) => choice.product.id === selectedId);
  const maximum = Math.min(mealQuantity, selected?.remaining || 0);
  const quantity = Math.min(requestedQuantity, maximum);
  const money = (value: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "SEK",
    }).format(value / 100);
  let groups: ReturnType<typeof parseModifierGroups> = [];
  let ready = Boolean(selected && quantity > 0);
  let addonAmount = 0;
  try {
    if (selected) {
      groups = parseModifierGroups(selected.product.modifier_groups);
      addonAmount =
        productUnitAmount(
          selected.product.price,
          resolveSelection(groups, selections).extraAmount,
        ) - discount;
    }
  } catch {
    ready = false;
  }
  return (
    <>
      <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-6">
        <button
          type="button"
          onClick={onBack}
          className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-dark/60"
        >
          <ArrowLeft size={16} />
          {t.edit("back")}
        </button>
        <h2
          ref={heading}
          tabIndex={-1}
          id={titleId}
          className="mt-5 text-2xl font-black tracking-tight outline-none sm:text-3xl"
        >
          {t.edit("title")}
        </h2>
        <p className="mt-3 text-sm leading-6 text-dark/65">
          {t.edit("description")}
        </p>
        <fieldset className="mt-5">
          <legend className="sr-only">
            {t.edit(kind === "drink" ? "chooseDrink" : "chooseSauce")}
          </legend>
          <div className="grid grid-cols-2 gap-3">
            {choices.map(({ product, remaining }) => {
              const checked = selectedId === product.id;
              const name = String(
                product[`name_${locale}` as keyof Product] || product.name,
              );
              const price = productUnitAmount(product.price);
              return (
                <label
                  key={product.id}
                  className={`relative cursor-pointer rounded-2xl border-2 bg-white p-3 transition ${checked ? "border-paprika shadow-sm" : "border-transparent hover:border-dark/15"} ${remaining < 1 ? "opacity-40" : ""}`}
                >
                  <div className="flex items-center justify-end gap-2">
                    {discount > 0 && (
                      <span className="mr-auto rounded-full bg-paprika/10 px-2 py-1 text-xs font-black text-paprika">
                        −5 kr
                      </span>
                    )}
                    <input
                      type="radio"
                      name={`${titleId}-addon`}
                      checked={checked}
                      disabled={remaining < 1}
                      aria-label={name}
                      onChange={() => {
                        setSelectedId(product.id);
                        setSelections([]);
                      }}
                      className="h-5 w-5 accent-paprika"
                    />
                  </div>
                  <div className="relative my-2 flex h-24 items-center justify-center sm:h-28">
                    {product.image_url ? (
                      <Image
                        src={product.image_url}
                        alt=""
                        fill
                        sizes="240px"
                        className="object-contain"
                        unoptimized
                      />
                    ) : kind === "drink" ? (
                      <GlassWater size={48} className="text-paprika/60" />
                    ) : (
                      <Soup size={48} className="text-paprika/60" />
                    )}
                  </div>
                  <p className="text-sm font-black">{name}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                    {discount > 0 && (
                      <s className="text-dark/45">{money(price)}</s>
                    )}
                    <span className="font-black text-paprika">
                      {money(price - discount)}
                    </span>
                  </p>
                </label>
              );
            })}
          </div>
        </fieldset>
        {selected && (
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-xl bg-white p-3">
              <span className="text-sm font-bold">
                {t.edit(kind === "drink" ? "drinkQuantity" : "sauceQuantity")}
              </span>
              <div className="flex items-center rounded-full bg-dark/5">
                <button
                  type="button"
                  aria-label={p("decrease")}
                  disabled={quantity <= 1}
                  onClick={() => setQuantity(quantity - 1)}
                  className="p-3 disabled:opacity-30"
                >
                  <Minus size={16} />
                </button>
                <span className="w-5 text-center font-black">{quantity}</span>
                <button
                  type="button"
                  aria-label={p("increase")}
                  disabled={quantity >= maximum}
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-3 disabled:opacity-30"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
            <ModifierChoices
              groups={groups}
              selections={selections}
              setSelections={setSelections}
              locale={locale}
            />
            {!ready && (
              <p role="status" className="text-sm text-paprika">
                {c.edit("completeRequired")}
              </p>
            )}
          </div>
        )}
      </div>
      <div className="border-t border-dark/10 bg-white px-5 py-4">
        {ready && discount > 0 && (
          <p className="mb-3 flex items-center justify-center gap-2 text-sm font-bold text-paprika">
            <Check size={16} />
            {t.edit("saving", { amount: money(discount * quantity) })}
          </p>
        )}
        <button
          type="button"
          disabled={!ready || disabled}
          onClick={() =>
            selected &&
            onAdd({ product: selected.product, quantity, selections })
          }
          className="w-full rounded-full bg-paprika px-4 py-3 text-sm font-black text-white disabled:opacity-40"
        >
          {t.edit(kind === "drink" ? "addCombo" : "addWithSauce")}
          {ready && ` · ${money(mealAmount + addonAmount * quantity)}`}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAdd()}
          className="mt-2 w-full rounded-full px-4 py-3 text-sm font-bold text-dark/65 disabled:opacity-40"
        >
          {t.edit("skip")} · {money(mealAmount)}
        </button>
      </div>
    </>
  );
}
