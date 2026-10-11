"use client";
import { EditableCopy } from "@/components/site-content/EditableCopy";
import Image from "next/image";
import { ChevronLeft, ChevronRight, UtensilsCrossed } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useEditableTranslations } from "@/components/site-content/EditableMessage";
import { getMenuCategories, menuTypes } from "@/lib/menu-display";
import { isSauceCategory } from "@/lib/menu-offers";
import type { Product } from "@/types/product";
import {
  ProductCard,
  type GroupProductSelection,
} from "@/components/ProductCard";

export function MenuCatalog({
  products,
  content,
  initialType = "all",
  initialCategory = "",
  groupSelection,
}: {
  products: Product[];
  content: Record<string, string>;
  initialType?: string;
  initialCategory?: string;
  groupSelection?: (product: Product) => GroupProductSelection;
}) {
  const t = useEditableTranslations("pages.menu");
  const c = useEditableTranslations("catalog");
  const [type, setType] = useState(initialType);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const rail = useRef<HTMLDivElement>(null);
  const activeTile = useRef<HTMLButtonElement>(null);
  const filtered = products.filter(
    (product) => type === "all" || product.menu_type === type,
  );
  const menuCategories = getMenuCategories(products, content, (id) =>
    t(`categories.${id}`),
  ).filter((category) =>
    filtered.some((product) => product.category === category.id),
  );
  const activeCategory =
    menuCategories.find((category) => category.id === selectedCategory) ||
    menuCategories[0];
  const active = activeCategory?.id;
  useEffect(() => {
    if (!rail.current || !activeTile.current) return;
    rail.current.scrollTo({
      left: activeTile.current.offsetLeft - rail.current.offsetLeft - 12,
      behavior: "smooth",
    });
  }, [active]);
  const selectedProducts = filtered.filter(
    (product) => product.category === active,
  );
  return (
    <div className="min-w-0">
      <div
        className="mb-6 flex gap-2 overflow-x-auto pb-2"
        aria-label={c("dietaryFilters")}
      >
        {menuTypes.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={type === option.id}
            onClick={() => setType(option.id)}
            className={`shrink-0 rounded-full border px-5 py-2.5 text-xs font-black uppercase tracking-wider transition ${type === option.id ? "border-dark bg-dark text-white" : "border-dark/15 bg-white/70 hover:border-dark/40"}`}
          >
            {t.edit(`types.${option.id}`)}
          </button>
        ))}
      </div>
      <div className="mb-3 flex items-center justify-end gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            aria-label={c("previous")}
            onClick={() =>
              rail.current?.scrollBy({ left: -280, behavior: "smooth" })
            }
            className="rounded-full border border-dark/15 p-2 hover:bg-white"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            aria-label={c("next")}
            onClick={() =>
              rail.current?.scrollBy({ left: 280, behavior: "smooth" })
            }
            className="rounded-full border border-dark/15 p-2 hover:bg-white"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div
        ref={rail}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-6 pt-1"
        role="group"
        aria-label={c("categories")}
      >
        {menuCategories.map(
          ({ id, title, textKey, image, hasCategoryImage }) => {
            const isActive = id === active;
            return (
              <button
                key={id}
                ref={isActive ? activeTile : undefined}
                type="button"
                aria-pressed={isActive}
                onClick={() => setSelectedCategory(id)}
                className={`relative w-32 shrink-0 snap-start overflow-visible rounded-2xl text-left transition sm:w-40 ${isActive ? "bg-paprika text-white shadow-lg shadow-paprika/20" : "bg-white hover:bg-white/80"}`}
              >
                <span className="relative block aspect-[4/3] overflow-hidden rounded-t-2xl bg-honey/15">
                  {image ? (
                    <Image
                      src={image}
                      alt=""
                      fill
                      sizes="160px"
                      className={
                        hasCategoryImage ? "object-cover" : "object-contain p-2"
                      }
                      unoptimized
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-paprika/60">
                      <UtensilsCrossed size={32} />
                    </span>
                  )}
                </span>
                <span className="flex min-h-16 items-center justify-center px-2 py-3 text-center text-sm font-black sm:text-base">
                  <EditableCopy value={title} textKey={textKey} page="menu" />
                </span>
                {isActive && (
                  <span className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 bg-paprika" />
                )}
              </button>
            );
          },
        )}
      </div>
      {activeCategory ? (
        <section aria-label={activeCategory.title} className="mt-5">
          <div className="mb-6 flex items-center gap-4">
            <span className="h-px flex-1 bg-dark/15" />
            <h2 className="text-center text-2xl font-black tracking-tight sm:text-3xl">
              <EditableCopy
                value={activeCategory.title}
                textKey={activeCategory.textKey}
                page="menu"
              />
            </h2>
            <span className="h-px flex-1 bg-dark/15" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">
            {selectedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                drinks={products.filter((item) => item.category === "drinks")}
                sauces={products.filter((item) =>
                  isSauceCategory(item.category),
                )}
                compact
                smallImage={isSauceCategory(product.category)}
                groupSelection={groupSelection?.(product)}
              />
            ))}
          </div>
        </section>
      ) : (
        <p
          role="status"
          className="rounded-2xl bg-white p-8 text-center text-dark/60"
        >
          {c.edit("empty")}
        </p>
      )}
    </div>
  );
}
