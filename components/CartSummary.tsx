"use client";

import { getPublicPath } from "@/i18n/paths";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useEditableTranslations } from "@/components/site-content/EditableMessage";
import { useCart } from "@/components/CartProvider";

export function CartSummary() {
  const params = useParams();
  const locale = String(params.locale || "sv");

  const t = useEditableTranslations("pages.cart");

  const combo = useEditableTranslations("combo");
  const { items, totalPrice, pricing, setQuantity, removeItem } = useCart();

  if (items.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-paprika/10 text-4xl">
          🛒
        </div>

        <h2 className="mt-6 text-2xl font-black text-dark">
          {t.edit("emptyTitle")}
        </h2>

        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-dark/60">
          {t.edit("emptyText")}
        </p>

        <Link
          href={getPublicPath(locale, "/menu")}
          className="btn-primary mt-6"
        >
          {t.edit("goToMenu")}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.lineId} className="glass-card flex gap-4 p-4">
            <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-honey/40 to-paprika/20">
              {item.image_url ? (
                <Image
                  src={item.image_url}
                  alt={item.name}
                  fill
                  sizes="96px"
                  className="object-contain p-2"
                  unoptimized
                />
              ) : (
                <div className="text-4xl">
                  {item.category === "maczanka"
                    ? "🥪"
                    : item.category === "knysza"
                      ? "🌯"
                      : item.category === "drinks"
                        ? "🥤"
                        : "🍟"}
                </div>
              )}
            </div>

            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-black text-dark">{item.name}</h3>

                {item.optionSummary && (
                  <p className="mt-1 text-sm text-dark/70">
                    {item.optionSummary}
                  </p>
                )}
                {item.subtitle ? (
                  <p className="mt-1 text-sm text-dark/60">{item.subtitle}</p>
                ) : null}

                <p className="mt-2 text-sm font-black text-paprika">
                  {pricing.lineDiscounts[item.lineId] > 0 && (
                    <s className="mr-2 font-normal text-dark/45">
                      {item.price * item.quantity} kr
                    </s>
                  )}
                  {pricing.lineTotals[item.lineId] / 100} kr
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label={t("decreaseQuantity")}
                  onClick={() => setQuantity(item.lineId, item.quantity - 1)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-dark shadow-sm transition hover:bg-cream"
                >
                  <Minus size={16} />
                </button>

                <span className="w-6 text-center font-black">
                  {item.quantity}
                </span>

                <button
                  type="button"
                  aria-label={t("increaseQuantity")}
                  disabled={
                    items
                      .filter((value) => value.id === item.id)
                      .reduce((sum, value) => sum + value.quantity, 0) >= 20
                  }
                  onClick={() => setQuantity(item.lineId, item.quantity + 1)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-dark shadow-sm transition hover:bg-cream"
                >
                  <Plus size={16} />
                </button>

                <button
                  type="button"
                  aria-label={t("removeItem")}
                  onClick={() => removeItem(item.lineId)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-paprika/10 text-paprika transition hover:bg-paprika hover:text-white"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <aside className="glass-card h-fit p-6">
        <h2 className="text-2xl font-black text-dark">
          {t.edit("summaryTitle")}
        </h2>

        <div className="mt-6 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-dark/60">{t.edit("subtotal")}</span>
            <span className="font-black">
              {(pricing.totalAmount + pricing.discountAmount) / 100} kr
            </span>
          </div>

          {pricing.discountAmount > 0 && (
            <div className="flex justify-between text-paprika">
              <span>{combo.edit("discount")}</span>
              <span className="font-black">
                −{pricing.discountAmount / 100} kr
              </span>
            </div>
          )}

          <div className="border-t border-dark/10 pt-4">
            <div className="flex justify-between text-lg">
              <span className="font-black">{t.edit("total")}</span>
              <span className="font-black text-paprika">{totalPrice} kr</span>
            </div>
          </div>
        </div>

        <Link href={`/${locale}/checkout`} className="btn-primary mt-6 w-full">
          {t.edit("checkout")}
        </Link>
      </aside>
    </div>
  );
}
