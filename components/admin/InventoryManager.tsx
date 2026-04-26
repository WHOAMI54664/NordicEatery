"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Minus, Plus, RotateCcw, Search } from "lucide-react";
import { useRouter } from "next/navigation";
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

  async function applyMovement() {
    if (!selectedProduct) return;

    setIsSaving(true);
    setErrorMessage("");

    const amount = Math.max(0, Number(quantity) || 0);

    if (amount <= 0) {
      setIsSaving(false);
      setErrorMessage("Quantity must be greater than 0.");
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
      data: { user },
    } = await supabase.auth.getUser();

    const { error: movementError } = await supabase
      .from("stock_movements")
      .insert({
        product_id: selectedProduct.id,
        type: movementType,
        quantity: amount,
        note: note || null,
        created_by: user?.id || null,
      });

    if (movementError) {
      setIsSaving(false);
      setErrorMessage(movementError.message);
      return;
    }

    const { error: productError } = await supabase
      .from("products")
      .update({
        stock_quantity: nextStock,
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
      <div className="glass-card mb-6 flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-dark/35"
          />
          <input
            className="input-field pl-11"
            placeholder="Search products..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="text-sm font-bold text-dark/50">
          {filteredProducts.length} products
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-3xl bg-paprika/10 p-4 text-sm font-bold text-paprika">
          {errorMessage}
        </div>
      )}

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
              className="glass-card grid gap-4 p-4 lg:grid-cols-[90px_1fr_160px_280px]"
            >
              <div className="relative h-20 w-20 overflow-hidden rounded-2xl bg-white/70">
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
                <p className="text-lg font-black text-dark">{product.name}</p>
                <p className="mt-1 text-sm text-dark/50">
                  {product.category} · {product.price} kr
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      product.is_available
                        ? "bg-green-100 text-green-700"
                        : "bg-dark/10 text-dark/50"
                    }`}
                  >
                    {product.is_available ? "Available" : "Hidden"}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      product.track_stock
                        ? "bg-paprika/10 text-paprika"
                        : "bg-dark/10 text-dark/50"
                    }`}
                  >
                    {product.track_stock ? "Stock tracked" : "No stock tracking"}
                  </span>

                  {isOutOfStock && (
                    <span className="rounded-full bg-paprika px-3 py-1 text-xs font-black text-white">
                      Out of stock
                    </span>
                  )}

                  {isLowStock && (
                    <span className="rounded-full bg-honey/25 px-3 py-1 text-xs font-black text-dark">
                      Low stock
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center lg:justify-center">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-dark/35">
                    Current stock
                  </p>
                  <p className="mt-2 text-4xl font-black text-paprika">
                    {product.track_stock ? product.stock_quantity : "∞"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
                <button
                  type="button"
                  onClick={() => openMovement(product, "in")}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-paprika px-3 py-3 text-sm font-black text-white transition hover:bg-cherry"
                >
                  <Plus size={16} />
                  Приход
                </button>

                <button
                  type="button"
                  onClick={() => openMovement(product, "out")}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-dark px-3 py-3 text-sm font-black text-white transition hover:opacity-90"
                >
                  <Minus size={16} />
                  Списание
                </button>

                <button
                  type="button"
                  onClick={() => openMovement(product, "adjustment")}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/80 px-3 py-3 text-sm font-black text-dark transition hover:bg-white"
                >
                  <RotateCcw size={16} />
                  Коррекция
                </button>

                <button
                  type="button"
                  onClick={() => toggleTrackStock(product)}
                  className="rounded-2xl bg-white/80 px-3 py-3 text-sm font-black text-dark transition hover:bg-white"
                >
                  {product.track_stock ? "No track" : "Track"}
                </button>

                {product.is_available ? (
                  <button
                    type="button"
                    onClick={() => setUnavailable(product)}
                    className="col-span-2 rounded-2xl bg-paprika/10 px-3 py-3 text-sm font-black text-paprika transition hover:bg-paprika hover:text-white"
                  >
                    Hide product
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAvailable(product)}
                    className="col-span-2 rounded-2xl bg-green-100 px-3 py-3 text-sm font-black text-green-700 transition hover:bg-green-200"
                  >
                    Show product
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-dark/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-white/70 bg-cream p-6 shadow-soft">
            <div className="mb-6">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-paprika">
                {movementType === "in"
                  ? "Приход"
                  : movementType === "out"
                    ? "Списание"
                    : "Коррекция"}
              </p>
              <h2 className="mt-2 text-2xl font-black text-dark">
                {selectedProduct.name}
              </h2>
              <p className="mt-2 text-sm font-bold text-dark/50">
                Current stock: {selectedProduct.stock_quantity}
              </p>
            </div>

            <label>
              <span className="mb-2 block text-sm font-bold text-dark">
                {movementType === "adjustment"
                  ? "New stock quantity"
                  : "Quantity"}
              </span>
              <input
                type="number"
                min="1"
                className="input-field"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                autoFocus
              />
            </label>

            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-bold text-dark">
                Note
              </span>
              <textarea
                className="input-field min-h-24 resize-none"
                placeholder="Supplier, reason, mistake correction..."
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={isSaving}
                onClick={applyMovement}
                className="btn-primary flex-1"
              >
                {isSaving ? "Saving..." : "Apply"}
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={() => setSelectedProduct(null)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}