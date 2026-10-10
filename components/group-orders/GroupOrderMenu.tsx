"use client";
import { ProductCard } from "@/components/ProductCard";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Product } from "@/types/product";
import type { PublicGroup } from "@/lib/group-orders/model";
import { categories, menuTypes, humanizeCategory } from "@/lib/menu-display";

export function GroupOrderMenu({
  products,
  me,
  editing,
  busy,
  catalogError,
  updateItem,
  content,
}: {
  locale: string;
  products: Product[];
  me: PublicGroup["members"][number] | undefined;
  editing: boolean;
  busy: boolean;
  catalogError: boolean;
  content: Record<string, string>;
  updateItem: (id: string, quantity: number, note?: string) => void;
}) {
  const t = useTranslations("groupOrder");
  const menu = useTranslations("pages.menu");
  const [type, setType] = useState("all");
  const known = new Set<string>(categories.map((category) => category.id));
  const displayCategories = [
    ...categories.map((category) => category.id),
    ...new Set(
      products
        .map((product) => product.category)
        .filter((category) => !known.has(category)),
    ),
  ];
  return (
    <>
      <div
        className="mb-5 flex gap-2 overflow-x-auto pb-2"
        aria-label={t("categories")}
      >
        {menuTypes.map((option) => (
          <button
            key={option.id}
            onClick={() => setType(option.id)}
            aria-pressed={type === option.id}
            className={`shrink-0 rounded-full px-6 py-3 text-sm font-black uppercase tracking-[0.18em] transition ${type === option.id ? "bg-paprika text-white shadow-lg shadow-paprika/20" : "border border-dark/10 bg-white text-dark hover:border-paprika hover:text-paprika"}`}
          >
            {menu(`types.${option.id}`)}
          </button>
        ))}
      </div>
      {catalogError && (
        <p role="alert" className="mb-4 text-paprika">
          {t("errors.unavailable")}
        </p>
      )}
      <div className="space-y-14">
        {displayCategories.map((category) => {
          const items = products.filter(
            (product) =>
              product.category === category &&
              (type === "all" || product.menu_type === type),
          );
          if (!items.length) return null;
          const key = known.has(category)
            ? `menu.categories.${category}`
            : `menu.categories.custom.${category}`;
          return (
            <section key={category}>
              <h2 className="mb-6 text-3xl font-black text-dark">
                {content[key] ||
                  (known.has(category)
                    ? menu(`categories.${category}`)
                    : humanizeCategory(category))}
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">
                {items.map((product) => {
                  const quantity =
                    me?.items.find(
                      (item) => item.productId === String(product.id),
                    )?.quantity || 0;
                  return (
                    <ProductCard
                      key={product.id}
                      product={product}
                      compact
                      groupSelection={{
                        disabled: busy || !editing,
                        remaining: 20 - quantity,
                        add: (count) =>
                          updateItem(String(product.id), quantity + count),
                      }}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
