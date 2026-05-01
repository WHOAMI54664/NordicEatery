"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Minus, Plus, RotateCcw, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/browser";

type Product = {
  id: string;
  name: string;
  subtitle: string | null;
  category: string;
  price: number;
  image_url: string | null;
  is_available: boolean;
  track_stock: boolean;
  stock_quantity: number;
};

type InventoryManagerProps = {
  products: Product[];
};

type MovementType = "in" | "out" | "adjustment";

export function InventoryManager({ products }: InventoryManagerProps) {
  const t = useTranslations("admin.inventory");

  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [query, setQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [movementType, setMovementType] = useState<MovementType>("in");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const filteredProducts = products.filter((product) => {
    const text = `${product.name} ${product.subtitle || ""} ${product.category}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });

  function movementLabel(type: MovementType) {
    if (type === "in") return t("in");
    if (type === "out") return t("out");
    return t("adjustment");
  }

  async function applyMovement() {
    if (!selectedProduct) return;

    setIsSaving(true);
    setErrorMessage("");

    const amount = Math.max(0, Number(quantity) || 0);

    if (amount <= 0) {
      setIsSaving(false);
      setErrorMessage(t("quantityGreaterThanZero"));
      return;
    }

    let nextStock = selectedProduct.stock_quantity;

    if (movementType === "in") {
      nextStock = selectedProduct.stock_quantity + amount;
    }

    if (movementType === "out") {
      nextStock = Math.max(0, selectedProduct.stock_quantity - amount);
    }

    if (movementType === "adjustment") {
      nextStock = amount;
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    const { error: movementError } = await supabase
        .from("stock_movements")
        .insert({
          product_id: selectedProduct.id,
          type: movementType,
          quantity: amount,
          note: note || null,
          created_by: user?.id || null
        });

    if (movementError) {
      setIsSaving(false);
      setErrorMessage(movementError.message);
      return;
    }

    const { error: productError } = await supabase
        .from("products")
        .update({
          stock_quantity: nextStock
        })
        .eq("id", selectedProduct.id);

    setIsSaving(false);

    if (productError) {
      setErrorMessage(productError.message);
      return;
    }

    setSelectedProduct(null);
    setQuantity("1");
    setNote("");
    setMovementType("in");
    router.refresh();
  }

  async function toggleTrackStock(product: Product) {
    const { error } = await supabase
        .from("products")
        .update({ track_stock: !product.track_stock })
        .eq("id", product.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.refresh();
  }

  async function setUnavailable(product: Product) {
    const { error } = await supabase
        .from("products")
        .update({ is_available: false })
        .eq("id", product.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.refresh();
  }

  async function setAvailable(product: Product) {
    const { error } = await supabase
        .from("products")
        .update({ is_available: true })
        .eq("id", product.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.refresh();
  }

  function openMovement(product: Product, type: MovementType) {
    setSelectedProduct(product);
    setMovementType(type);
    setQuantity(type === "adjustment" ? String(product.stock_quantity) : "1");
    setNote("");
    setErrorMessage("");
  }

  return (
      <div>
        <div className="mb-6 flex flex-col gap-4 rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-4 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A39388]"
            />

            <input
                className="h-12 w-full rounded-2xl border border-[#EADDCF] bg-white/75 pl-11 pr-4 text-sm font-semibold text-[#25120F] outline-none shadow-inner shadow-[#4C2314]/5 transition placeholder:text-[#A39388] focus:border-[#E51B23]/25 focus:bg-white focus:ring-4 focus:ring-[#E51B23]/8"
                placeholder={t("searchPlaceholder")}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="rounded-2xl border border-[#EADDCF] bg-white/70 px-4 py-2 text-sm font-black text-[#7B6A61]">
            {filteredProducts.length} {t("products")}
          </div>
        </div>

        {errorMessage ? (
            <div className="mb-6 rounded-3xl border border-[#E51B23]/15 bg-[#E51B23]/8 p-4 text-sm font-bold text-[#C7192E]">
              {errorMessage}
            </div>
        ) : null}

        <div className="grid gap-4">
          {filteredProducts.map((product) => {
            const isOutOfStock =
                product.track_stock && Number(product.stock_quantity) <= 0;

            const isLowStock =
                product.track_stock &&
                Number(product.stock_quantity) > 0 &&
                Number(product.stock_quantity) <= 5;

            return (
                <div
                    key={product.id}
                    className="grid gap-4 rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-4 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl lg:grid-cols-[90px_1fr_160px_280px]"
                >
                  <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-[#EADDCF] bg-white/70">
                    {product.image_url ? (
                        <Image
                            src={product.image_url}
                            alt={product.name}
                            fill
                            sizes="80px"
                            className="object-contain p-2"
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center text-3xl">
                          🍽️
                        </div>
                    )}
                  </div>

                  <div>
                    <p className="text-lg font-black text-[#25120F]">
                      {product.name}
                    </p>

                    <p className="mt-1 text-sm font-medium text-[#7B6A61]">
                      {product.category} · {product.price} kr
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                  <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                          product.is_available
                              ? "bg-emerald-500/10 text-emerald-700"
                              : "bg-[#25120F]/10 text-[#7B6A61]"
                      }`}
                  >
                    {product.is_available ? t("available") : t("hidden")}
                  </span>

                      <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                              product.track_stock
                                  ? "bg-[#E51B23]/8 text-[#C7192E]"
                                  : "bg-[#25120F]/10 text-[#7B6A61]"
                          }`}
                      >
                    {product.track_stock
                        ? t("stockTracked")
                        : t("noStockTracking")}
                  </span>

                      {isOutOfStock ? (
                          <span className="rounded-full bg-[#E51B23] px-3 py-1 text-xs font-black text-white">
                      {t("outOfStock")}
                    </span>
                      ) : null}

                      {isLowStock ? (
                          <span className="rounded-full bg-[#F6A21A]/20 px-3 py-1 text-xs font-black text-[#8A5A00]">
                      {t("lowStock")}
                    </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center lg:justify-center">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#A39388]">
                        {t("currentStock")}
                      </p>

                      <p className="mt-2 text-4xl font-black text-[#C7192E]">
                        {product.track_stock ? product.stock_quantity : "∞"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
                    <button
                        type="button"
                        onClick={() => openMovement(product, "in")}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#E51B23] px-3 py-3 text-sm font-black text-white transition hover:bg-[#C7192E]"
                    >
                      <Plus size={16} />
                      {t("in")}
                    </button>

                    <button
                        type="button"
                        onClick={() => openMovement(product, "out")}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#25120F] px-3 py-3 text-sm font-black text-white transition hover:opacity-90"
                    >
                      <Minus size={16} />
                      {t("out")}
                    </button>

                    <button
                        type="button"
                        onClick={() => openMovement(product, "adjustment")}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#EADDCF] bg-white/80 px-3 py-3 text-sm font-black text-[#25120F] transition hover:bg-white"
                    >
                      <RotateCcw size={16} />
                      {t("adjustment")}
                    </button>

                    <button
                        type="button"
                        onClick={() => toggleTrackStock(product)}
                        className="rounded-2xl border border-[#EADDCF] bg-white/80 px-3 py-3 text-sm font-black text-[#25120F] transition hover:bg-white"
                    >
                      {product.track_stock ? t("noTrack") : t("track")}
                    </button>

                    {product.is_available ? (
                        <button
                            type="button"
                            onClick={() => setUnavailable(product)}
                            className="col-span-2 rounded-2xl bg-[#E51B23]/8 px-3 py-3 text-sm font-black text-[#C7192E] transition hover:bg-[#E51B23] hover:text-white"
                        >
                          {t("hideProduct")}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setAvailable(product)}
                            className="col-span-2 rounded-2xl bg-emerald-500/10 px-3 py-3 text-sm font-black text-emerald-700 transition hover:bg-emerald-500/20"
                        >
                          {t("showProduct")}
                        </button>
                    )}
                  </div>
                </div>
            );
          })}
        </div>

        {selectedProduct ? (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#25120F]/45 p-4 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6] p-6 shadow-2xl shadow-[#4C2314]/20">
                <div className="mb-6">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#C7192E]">
                    {movementLabel(movementType)}
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-[#25120F]">
                    {selectedProduct.name}
                  </h2>

                  <p className="mt-2 text-sm font-bold text-[#7B6A61]">
                    {t("currentStock")}: {selectedProduct.stock_quantity}
                  </p>
                </div>

                <label>
              <span className="mb-2 block text-sm font-bold text-[#25120F]">
                {movementType === "adjustment"
                    ? t("newStockQuantity")
                    : t("quantity")}
              </span>

                  <input
                      type="number"
                      min="1"
                      className="h-12 w-full rounded-2xl border border-[#EADDCF] bg-white/75 px-4 text-sm font-semibold text-[#25120F] outline-none shadow-inner shadow-[#4C2314]/5 transition focus:border-[#E51B23]/25 focus:bg-white focus:ring-4 focus:ring-[#E51B23]/8"
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                      autoFocus
                  />
                </label>

                <label className="mt-4 block">
              <span className="mb-2 block text-sm font-bold text-[#25120F]">
                {t("note")}
              </span>

                  <textarea
                      className="min-h-24 w-full resize-none rounded-2xl border border-[#EADDCF] bg-white/75 px-4 py-3 text-sm font-semibold text-[#25120F] outline-none shadow-inner shadow-[#4C2314]/5 transition placeholder:text-[#A39388] focus:border-[#E51B23]/25 focus:bg-white focus:ring-4 focus:ring-[#E51B23]/8"
                      placeholder={t("notePlaceholder")}
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                  />
                </label>

                <div className="mt-6 flex gap-3">
                  <button
                      type="button"
                      disabled={isSaving}
                      onClick={applyMovement}
                      className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-[#E51B23] px-5 text-sm font-black text-white shadow-lg shadow-[#E51B23]/20 transition hover:bg-[#C7192E] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? t("saving") : t("apply")}
                  </button>

                  <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => setSelectedProduct(null)}
                      className="flex h-12 flex-1 items-center justify-center rounded-2xl border border-[#EADDCF] bg-white/75 px-5 text-sm font-black text-[#25120F] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {t("cancel")}
                  </button>
                </div>
              </div>
            </div>
        ) : null}
      </div>
  );
}