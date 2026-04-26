"use client";

import Image from "next/image";
import { Plus } from "lucide-react";
import type { Product } from "@/types/product";
import { useCart } from "@/components/CartProvider";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();

  return (
    <article className="glass-card group overflow-hidden p-4 transition duration-300 hover:-translate-y-1 hover:bg-white/85">
      <div className="relative mb-5 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-honey/45 via-paprika/20 to-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.8),transparent_30%)]" />


        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-contain p-6 drop-shadow-xl"
          />
        ) : (
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white/75 text-5xl shadow-xl">
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
          <span className="absolute left-4 top-4 rounded-full bg-white/85 px-3 py-1 text-xs font-black uppercase tracking-wide text-paprika">
            {product.badge}
          </span>
        )}
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-black tracking-tight text-dark">
            {product.name}
          </h3>
          <p className="mt-1 text-sm font-bold text-paprika">
            {product.subtitle}
          </p>
        </div>
        <p className="rounded-full bg-dark px-3 py-1 text-sm font-black text-white">
          {product.price} kr
        </p>
      </div>

      <p className="mt-4 min-h-12 text-sm leading-6 text-dark/65">
        {product.description}
      </p>

      <button
        type="button"
        onClick={() => addItem(product)}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-paprika px-4 py-3 text-sm font-black text-white transition hover:bg-cherry"
      >
        <Plus size={18} />
        Add to cart
      </button>
    </article>
  );
}
