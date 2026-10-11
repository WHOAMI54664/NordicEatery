"use client";
import Image from "next/image";
import { ModifierChoices } from "./ModifierChoices";
import { AddonOffer, type AddonChoice, type SelectedAddon } from "./AddonOffer";
import type { AddonKind } from "@/lib/menu-offers";
import { Minus, Plus, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useEditableTranslations } from "@/components/site-content/EditableMessage";
import type { Product } from "@/types/product";
import {
  parseModifierGroups,
  resolveSelection,
  productUnitAmount,
  type Selection,
} from "@/lib/menu-options";

export function ProductConfigurator({
  product,
  locale,
  remaining,
  disabled,
  group,
  offer,
  error,
  onClose,
  onAdd,
}: {
  product: Product;
  locale: string;
  remaining: number;
  disabled: boolean;
  group: boolean;
  offer?: { kind: AddonKind; choices: AddonChoice[] };
  error?: string;
  onClose: () => void;
  onAdd: (
    quantity: number,
    selections: Selection[],
    addon?: SelectedAddon,
  ) => void;
}) {
  const t = useEditableTranslations("productCard");
  const c = useEditableTranslations("customization");
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [showOffer, setShowOffer] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selections, setSelections] = useState<Selection[]>([]);
  useEffect(() => {
    const element = dialog.current;
    const focus = document.activeElement as HTMLElement | null;
    element?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      focus?.focus();
    };
  }, []);
  const name = String(
    product[`name_${locale}` as keyof Product] || product.name,
  );
  const description = String(
    product[`description_${locale}` as keyof Product] ||
      product.description ||
      "",
  );
  let groups: ReturnType<typeof parseModifierGroups> = [];
  let configurationError = false;
  try {
    groups = parseModifierGroups(product.modifier_groups);
  } catch {
    configurationError = true;
  }
  let ready = !configurationError;
  try {
    resolveSelection(groups, selections);
  } catch {
    ready = false;
  }
  const extra = groups.reduce(
    (sum, optionGroup) =>
      sum +
      optionGroup.options
        .filter((option) =>
          selections
            .find((value) => value.groupId === optionGroup.id)
            ?.optionIds.includes(option.id),
        )
        .reduce((subtotal, option) => subtotal + option.price, 0),
    0,
  );
  const amount = productUnitAmount(product.price, extra);
  const money = (value: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "SEK",
      maximumFractionDigits: 2,
    }).format(value / 100);
  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="product-dialog"
    >
      <div className="relative flex max-h-[92dvh] flex-col overflow-hidden rounded-t-[2rem] bg-cream sm:rounded-[2rem]">
        <div className="flex items-center justify-end border-b border-dark/10 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="rounded-full bg-dark/5 p-2.5"
          >
            <X size={20} />
          </button>
        </div>
        {error && (
          <p role="alert" className="px-5 py-3 text-sm font-bold text-paprika">
            {error}
          </p>
        )}
        {showOffer && offer ? (
          <AddonOffer
            choices={offer.choices}
            kind={offer.kind}
            locale={locale}
            titleId={titleId}
            mealQuantity={quantity}
            mealAmount={amount * quantity}
            disabled={disabled || quantity > remaining}
            onBack={() => setShowOffer(false)}
            onAdd={(addon) => onAdd(quantity, selections, addon)}
          />
        ) : (
          <>
            <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-6">
              {product.image_url && (
                <div className="relative mt-4 aspect-[2/1] overflow-hidden rounded-2xl bg-gradient-to-br from-honey/25 to-white">
                  <Image
                    src={product.image_url}
                    alt={name}
                    fill
                    sizes="(max-width: 640px) 100vw, 560px"
                    className="object-contain p-4"
                    unoptimized
                  />
                </div>
              )}
              <div className="my-6 flex items-start justify-between gap-4">
                <h2
                  id={titleId}
                  className="text-2xl font-black tracking-tight sm:text-3xl"
                >
                  {name}
                </h2>
                <p className="shrink-0 font-bold text-paprika">
                  {money(productUnitAmount(product.price))}
                </p>
              </div>
              <p className="mb-6 whitespace-pre-wrap break-words text-sm leading-6 text-dark/65">
                {description}
              </p>
              {configurationError && (
                <p role="alert">{c.edit("unavailable")}</p>
              )}
              <ModifierChoices
                groups={groups}
                selections={selections}
                setSelections={setSelections}
                locale={locale}
              />
            </div>
            <div className="border-t border-dark/10 bg-white px-5 py-4">
              {!ready && (
                <p
                  role="status"
                  className="mb-3 text-sm font-semibold text-paprika"
                >
                  {c.edit("completeRequired")}
                </p>
              )}
              <div className="flex items-center gap-3">
                <div className="flex items-center rounded-full bg-dark/5">
                  <button
                    type="button"
                    disabled={quantity <= 1}
                    aria-label={t("decrease")}
                    className="p-3 disabled:opacity-30"
                    onClick={() => setQuantity((value) => value - 1)}
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-5 text-center font-black">{quantity}</span>
                  <button
                    type="button"
                    disabled={quantity >= remaining}
                    aria-label={t("increase")}
                    className="p-3 disabled:opacity-30"
                    onClick={() => setQuantity((value) => value + 1)}
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <button
                  type="button"
                  disabled={!ready || disabled || quantity > remaining}
                  onClick={() =>
                    offer?.choices.length
                      ? setShowOffer(true)
                      : onAdd(quantity, selections)
                  }
                  className="flex-1 rounded-full bg-paprika px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t.edit(group ? "addToGroup" : "addToCart", { quantity })}
                  <span className="block sm:inline">
                    {" "}
                    · {money(amount * quantity)}
                  </span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
