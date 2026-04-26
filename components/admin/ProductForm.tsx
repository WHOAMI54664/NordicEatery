"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

type ProductFormValues = {
  id?: string;
  name?: string;
  subtitle?: string;
  description?: string;
  price?: number;
  category?: string;
  badge?: string | null;
  image_url?: string | null;
  is_popular?: boolean;
  is_available?: boolean;
  sort_order?: number;
  stock_quantity?: number;
  track_stock?: boolean;
};

type ProductFormProps = {
  mode: "create" | "edit";
  product?: ProductFormValues;
};

function makeProductId(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ProductForm({ mode, product }: ProductFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [name, setName] = useState(product?.name || "");
  const [subtitle, setSubtitle] = useState(product?.subtitle || "");
  const [description, setDescription] = useState(product?.description || "");
  const [price, setPrice] = useState(String(product?.price || ""));
  const [category, setCategory] = useState(product?.category || "maczanka");
  const [badge, setBadge] = useState(product?.badge || "");
  const [imageUrl, setImageUrl] = useState(product?.image_url || "");
  const [isPopular, setIsPopular] = useState(product?.is_popular || false);
  const [isAvailable, setIsAvailable] = useState(
    product?.is_available ?? true
  );
  const [sortOrder, setSortOrder] = useState(String(product?.sort_order || 0));
  const [stockQuantity, setStockQuantity] = useState(
    String(product?.stock_quantity ?? 0)
  );
  const [trackStock, setTrackStock] = useState(product?.track_stock ?? false);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function uploadImage(file: File) {
    setIsUploading(true);
    setErrorMessage("");

    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${fileExt}`;

    const filePath = `products/${fileName}`;

    const { error } = await supabase.storage
      .from("product-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      setIsUploading(false);
      setErrorMessage(error.message);
      return;
    }

    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(filePath);

    setImageUrl(data.publicUrl);
    setIsUploading(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSaving(true);
    setErrorMessage("");

    const productId = product?.id || makeProductId(name);

    if (!productId) {
      setIsSaving(false);
      setErrorMessage("Product name is required.");
      return;
    }

    const payload = {
      id: productId,
      name,
      subtitle,
      description,
      price: Number(price),
      category,
      badge: badge || null,
      image_url: imageUrl || null,
      is_popular: isPopular,
      is_available: isAvailable,
      sort_order: Number(sortOrder) || 0,
      track_stock: trackStock,
      stock_quantity: trackStock ? Math.max(0, Number(stockQuantity) || 0) : 0,
    };

    const request =
      mode === "create"
        ? supabase.from("products").insert(payload)
        : supabase.from("products").update(payload).eq("id", productId);

    const { error } = await request;

    setIsSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.push("/admin/products");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-6 lg:grid-cols-[1fr_360px]"
    >
      <div className="glass-card p-6">
        <h2 className="text-2xl font-black text-dark">
          {mode === "create" ? "Add product" : "Edit product"}
        </h2>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="mb-2 block text-sm font-bold text-dark">
              Product name
            </span>
            <input
              required
              className="input-field"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Maczanka Krakowska"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold text-dark">
              Subtitle
            </span>
            <input
              required
              className="input-field"
              value={subtitle}
              onChange={(event) => setSubtitle(event.target.value)}
              placeholder="Signature pork sandwich"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold text-dark">
              Category
            </span>
            <select
              className="input-field"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="maczanka">Maczanka</option>
              <option value="knysza">Knysza</option>
              <option value="sides">Sides</option>
              <option value="drinks">Drinks</option>
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold text-dark">
              Price, kr
            </span>
            <input
              required
              type="number"
              min="0"
              className="input-field"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="129"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold text-dark">
              Badge
            </span>
            <input
              className="input-field"
              value={badge}
              onChange={(event) => setBadge(event.target.value)}
              placeholder="Signature"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold text-dark">
              Sort order
            </span>
            <input
              type="number"
              className="input-field"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              placeholder="0"
            />
          </label>

          {trackStock && (
            <label>
              <span className="mb-2 block text-sm font-bold text-dark">
                Stock quantity
              </span>
              <input
                type="number"
                min="0"
                className="input-field"
                value={stockQuantity}
                onChange={(event) => setStockQuantity(event.target.value)}
                placeholder="10"
              />
            </label>
          )}

          <label className="sm:col-span-2">
            <span className="mb-2 block text-sm font-bold text-dark">
              Description
            </span>
            <textarea
              required
              className="input-field min-h-32 resize-none"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Slow-cooked pork, rich gravy sauce, pickles and onion."
            />
          </label>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-white/70 px-4 py-3 text-sm font-bold text-dark">
            <span>Popular</span>
            <input
              type="checkbox"
              checked={isPopular}
              onChange={(event) => setIsPopular(event.target.checked)}
            />
          </label>

          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-white/70 px-4 py-3 text-sm font-bold text-dark">
            <span>Available</span>
            <input
              type="checkbox"
              checked={isAvailable}
              onChange={(event) => setIsAvailable(event.target.checked)}
            />
          </label>

          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-white/70 px-4 py-3 text-sm font-bold text-dark">
            <span>Track stock</span>
            <input
              type="checkbox"
              checked={trackStock}
              onChange={(event) => setTrackStock(event.target.checked)}
            />
          </label>
        </div>

        <div className="mt-5 rounded-2xl bg-white/60 p-4 text-sm leading-6 text-dark/60">
          {trackStock ? (
            <>
              Stock tracking is ON. This item will be hidden from the customer
              menu when stock is 0.
            </>
          ) : (
            <>
              Stock tracking is OFF. Use this for dishes prepared to order, like
              Maczanka or Knysza.
            </>
          )}
        </div>

        {trackStock && Number(stockQuantity) <= 0 && (
          <div className="mt-5 rounded-2xl bg-paprika/10 p-4 text-sm font-bold text-paprika">
            Stock is 0. This product will be hidden from the customer menu.
          </div>
        )}

        {errorMessage && (
          <div className="mt-5 rounded-2xl bg-paprika/10 p-4 text-sm font-bold text-paprika">
            {errorMessage}
          </div>
        )}
      </div>

      <aside className="glass-card h-fit p-6">
        <h3 className="text-xl font-black text-dark">Product photo</h3>

        <div className="relative mt-5 flex aspect-square items-center justify-center overflow-hidden rounded-[1.5rem] bg-white/70">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={name || "Product image"}
              fill
              sizes="360px"
              className="object-contain p-4"
            />
          ) : (
            <div className="text-center text-dark/40">
              <div className="text-5xl">🍽️</div>
              <p className="mt-3 text-sm font-bold">No image</p>
            </div>
          )}
        </div>

        <label className="mt-5 flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-dark px-4 py-3 text-sm font-black text-white transition hover:opacity-90">
          <Upload size={18} />
          {isUploading ? "Uploading..." : "Upload photo"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            disabled={isUploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) uploadImage(file);
            }}
          />
        </label>

        <button
          type="submit"
          disabled={isSaving || isUploading}
          className="btn-primary mt-4 w-full"
        >
          {isSaving
            ? "Saving..."
            : mode === "create"
              ? "Create product"
              : "Save changes"}
        </button>
      </aside>
    </form>
  );
}