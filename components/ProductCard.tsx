"use client";

import Image from "next/image";
import { Plus } from "lucide-react";
import { useParams } from "next/navigation";
import { useEditableTranslations } from "@/components/site-content/EditableMessage";
import { useState } from "react";
import type { Product } from "@/types/product";
import { useCart } from "@/components/CartProvider";
import { useKitchenStatus } from "@/components/KitchenStatusProvider";

import { ProductConfigurator } from "@/components/menu/ProductConfigurator";
import type { Selection } from "@/lib/menu-options";
import { parseModifierGroups, productUnitAmount } from "@/lib/menu-options";
import { COMBO_DISCOUNT } from "@/lib/meal-combo";
import type { CartAddition } from "@/lib/cart";
import type { SelectedAddon } from "@/components/menu/AddonOffer";
import { getAddonKind, isSauceCategory } from "@/lib/menu-offers";

export type GroupProductSelection = {
  disabled: boolean;
  remainingFor: (productId: string) => number;
  freeLines: number;
  add: (additions: CartAddition[]) => Promise<boolean>;
};

type ProductCardProps = {
  product: Product;
  compact?: boolean;
  smallImage?: boolean;
  drinks?: Product[];
  sauces?: Product[];
  groupSelection?: GroupProductSelection;
};

export function ProductCard({
  product,
  compact = false,
  smallImage = false,
  drinks = [],
  sauces = [],
  groupSelection,
}: ProductCardProps) {
  const t = useEditableTranslations("productCard");
  const { addItems, items } = useCart();
  const combo = useEditableTranslations("combo");
  const { requireShiftOpen } = useKitchenStatus();
  const params = useParams();
  const locale = String(params.locale || "en");

  const [isOpen, setIsOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const name =
    (product[`name_${locale}` as keyof Product] as string) || product.name;

  const description =
    (product[`description_${locale}` as keyof Product] as string) ||
    product.description;

  const subtitle =
    (product[`subtitle_${locale}` as keyof Product] as string) ||
    product.subtitle;

  function remainingFor(item: Product) {
    const capacity =
      groupSelection?.remainingFor(item.id) ??
      20 -
        items
          .filter((entry) => entry.id === item.id)
          .reduce((sum, entry) => sum + entry.quantity, 0);
    return Math.max(
      0,
      item.track_stock
        ? Math.min(capacity, Number(item.stock_quantity || 0) - (20 - capacity))
        : capacity,
    );
  }
  const remaining = remainingFor(product);
  const disabled =
    adding ||
    Boolean(groupSelection?.disabled) ||
    remaining < 1 ||
    (!groupSelection && items.length >= 100);
  const addonKind = getAddonKind(product.category);
  const offerProducts = addonKind === "sauce" ? sauces : drinks;
  const addonChoices =
    (groupSelection?.freeLines ?? 100 - items.length) >= 2
      ? offerProducts
          .filter((addon) => {
            try {
              parseModifierGroups(addon.modifier_groups);
              return (
                (addonKind === "sauce"
                  ? isSauceCategory(addon.category)
                  : addon.category === "drinks") &&
                addon.is_available !== false &&
                productUnitAmount(addon.price) >=
                  (addonKind === "drink" ? COMBO_DISCOUNT : 0)
              );
            } catch {
              return false;
            }
          })
          .map((addon) => ({
            product: addon,
            remaining: remainingFor(addon),
          }))
          .filter((addon) => addon.remaining > 0)
      : [];
  async function addSelectedQuantity(
    quantity: number,
    selections: Selection[],
    addon?: SelectedAddon,
  ) {
    if (disabled || quantity > remaining) return;
    setError("");
    if (!groupSelection && !requireShiftOpen()) {
      setIsOpen(false);
      return;
    }
    if (
      addon &&
      addon.quantity >
        (addonChoices.find((choice) => choice.product.id === addon.product.id)
          ?.remaining || 0)
    ) {
      setError(combo("addFailed"));
      return;
    }
    const additions = [
      { product, selections, quantity },
      ...(addon ? [addon] : []),
    ];
    setAdding(true);
    try {
      const added = groupSelection
        ? await groupSelection.add(additions)
        : addItems(additions);
      if (added) setIsOpen(false);
      else setError(combo("addFailed"));
    } finally {
      setAdding(false);
    }
  }

  return (
    <>
      <article
        className={`glass-card group relative overflow-hidden transition duration-300 hover:-translate-y-1 hover:bg-white/85 ${
          compact ? "p-3" : "p-4"
        }`}
      >
        <div
          className={`relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-br from-honey/45 via-paprika/20 to-white ${
            compact ? "mb-3 rounded-[1.1rem]" : "mb-5 rounded-[1.5rem]"
          }`}
        >
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={name}
              fill
              sizes="(max-width: 768px) 50vw, 33vw"
              className={`object-contain drop-shadow-xl transition duration-300 ${
                smallImage
                  ? "scale-[0.7] group-hover:scale-75"
                  : "group-hover:scale-105"
              } ${compact ? "p-3" : "p-6"}`}
              unoptimized
            />
          ) : (
            <div
              className={`relative flex items-center justify-center rounded-full bg-white/75 shadow-xl ${
                compact ? "h-16 w-16 text-3xl" : "h-24 w-24 text-5xl"
              }`}
            >
              {product.category === "maczanka"
                ? "🥪"
                : product.category === "knysza"
                  ? "🌯"
                  : product.category === "drinks"
                    ? "🥤"
                    : "🍟"}
            </div>
          )}

          {product.badge && (
            <span className="absolute left-3 top-3 rounded-full bg-white/85 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-paprika sm:px-3 sm:text-xs">
              {product.badge}
            </span>
          )}
        </div>

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3
              className={`font-black tracking-tight text-dark ${
                compact ? "line-clamp-2 text-base" : "text-xl"
              }`}
            >
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="text-left after:absolute after:inset-0 after:rounded-[2rem] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-paprika"
              >
                {name}
              </button>
            </h3>

            {!compact && subtitle && (
              <p className="mt-1 text-sm font-bold text-paprika">{subtitle}</p>
            )}
          </div>

          <p
            className={`shrink-0 rounded-full bg-dark font-black text-white ${
              compact ? "px-2 py-1 text-xs" : "px-3 py-1 text-sm"
            }`}
          >
            {product.price} kr
          </p>
        </div>

        {!compact && (
          <p className="mt-4 line-clamp-2 min-h-12 text-sm leading-6 text-dark/65">
            {description}
          </p>
        )}

        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(true)}
          className={`relative z-10 flex w-full items-center justify-center gap-2 bg-paprika font-black text-white transition hover:bg-cherry ${
            compact
              ? "mt-4 rounded-xl px-3 py-2 text-xs"
              : "mt-6 rounded-2xl px-4 py-3 text-sm"
          }`}
        >
          <Plus size={compact ? 15 : 18} />
          {t.edit("customize")}
        </button>
      </article>

      {isOpen && (
        <ProductConfigurator
          product={product}
          locale={locale}
          remaining={remaining}
          disabled={disabled}
          group={Boolean(groupSelection)}
          offer={
            addonKind && addonChoices.length
              ? { kind: addonKind, choices: addonChoices }
              : undefined
          }
          error={error}
          onClose={() => setIsOpen(false)}
          onAdd={addSelectedQuantity}
        />
      )}
    </>
  );
}
