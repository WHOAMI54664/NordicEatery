"use client";

import Image from "next/image";
import { Minus, Plus, X } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import type { Product } from "@/types/product";
import { useCart } from "@/components/CartProvider";

type ProductCardProps = {
    product: Product;
    compact?: boolean;
};

export function ProductCard({ product, compact = false }: ProductCardProps) {
    const { addItem } = useCart();
    const params = useParams();
    const locale = String(params.locale || "en");

    const [isOpen, setIsOpen] = useState(false);
    const [quantity, setQuantity] = useState(1);

    const name =
        (product[`name_${locale}` as keyof Product] as string) || product.name;

    const description =
        (product[`description_${locale}` as keyof Product] as string) ||
        product.description;

    const subtitle =
        (product[`subtitle_${locale}` as keyof Product] as string) ||
        product.subtitle;

    const totalPrice = product.price * quantity;

    function addSelectedQuantity() {
        for (let i = 0; i < quantity; i += 1) {
            addItem(product);
        }

        setQuantity(1);
        setIsOpen(false);
    }

    return (
        <>
            <article
                onClick={() => setIsOpen(true)}
                className={`glass-card group cursor-pointer overflow-hidden transition duration-300 hover:-translate-y-1 hover:bg-white/85 ${
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
                            className={`object-contain drop-shadow-xl transition duration-300 group-hover:scale-105 ${
                                compact ? "p-3" : "p-6"
                            }`}
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
                            {name}
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
                    onClick={(event) => {
                        event.stopPropagation();
                        addItem(product);
                    }}
                    className={`flex w-full items-center justify-center gap-2 bg-paprika font-black text-white transition hover:bg-cherry ${
                        compact
                            ? "mt-4 rounded-xl px-3 py-2 text-xs"
                            : "mt-6 rounded-2xl px-4 py-3 text-sm"
                    }`}
                >
                    <Plus size={compact ? 15 : 18} />
                    Add
                </button>
            </article>

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-end bg-dark/60 backdrop-blur-sm sm:items-center sm:justify-center">
                    <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[2rem] bg-cream shadow-2xl sm:max-w-xl sm:rounded-[2rem]">
                        <div className="sticky top-0 z-10 flex items-center justify-between bg-cream/90 px-5 py-4 backdrop-blur">
                            <p className="text-xs font-black uppercase tracking-[0.25em] text-paprika">
                                Product details
                            </p>

                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-dark shadow"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="px-5 pb-5">
                            <div className="relative aspect-[4/3] overflow-hidden rounded-[1.7rem] bg-gradient-to-br from-honey/45 via-paprika/20 to-white">
                                {product.image_url ? (
                                    <Image
                                        src={product.image_url}
                                        alt={name}
                                        fill
                                        sizes="100vw"
                                        className="object-contain p-5"
                                        unoptimized
                                    />
                                ) : (
                                    <div className="flex h-full items-center justify-center text-7xl">
                                        🍔
                                    </div>
                                )}

                                {product.badge && (
                                    <span className="absolute left-4 top-4 rounded-full bg-white/90 px-4 py-2 text-xs font-black uppercase tracking-wide text-paprika">
                    {product.badge}
                  </span>
                                )}
                            </div>

                            <div className="mt-6">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h2 className="text-3xl font-black tracking-tight text-dark">
                                            {name}
                                        </h2>

                                        {subtitle && (
                                            <p className="mt-2 text-base font-black text-paprika">
                                                {subtitle}
                                            </p>
                                        )}
                                    </div>

                                    <p className="rounded-full bg-dark px-4 py-2 text-base font-black text-white">
                                        {product.price} kr
                                    </p>
                                </div>

                                <p className="mt-5 text-base leading-8 text-dark/65">
                                    {description}
                                </p>

                                <div className="mt-6 rounded-3xl bg-white/70 p-4">
                                    <p className="text-sm font-black text-dark">Quantity</p>

                                    <div className="mt-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setQuantity((value) => Math.max(1, value - 1))
                                                }
                                                className="flex h-11 w-11 items-center justify-center rounded-full bg-dark/5 text-dark"
                                            >
                                                <Minus size={18} />
                                            </button>

                                            <span className="w-8 text-center text-xl font-black text-dark">
                        {quantity}
                      </span>

                                            <button
                                                type="button"
                                                onClick={() => setQuantity((value) => value + 1)}
                                                className="flex h-11 w-11 items-center justify-center rounded-full bg-paprika text-white"
                                            >
                                                <Plus size={18} />
                                            </button>
                                        </div>

                                        <p className="text-xl font-black text-paprika">
                                            {totalPrice} kr
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={addSelectedQuantity}
                                    className="btn-primary mt-6 w-full"
                                >
                                    Add {quantity} to cart · {totalPrice} kr
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}