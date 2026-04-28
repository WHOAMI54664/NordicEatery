"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Upload } from "lucide-react";
import { useTranslations } from "next-intl";
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
  locale?: string;
};

function makeProductId(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ProductForm({
  mode,
  product,
  locale = "en",
}: ProductFormProps) {
  const t = useTranslations("admin.products");
  const common = useTranslations("admin.common");

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
  const [isAvailable, setIsAvailable] = useState(product?.is_available ?? true);
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
      .upload(filePath, file);

    if (error) {
      setErrorMessage(error.message);
      setIsUploading(false);
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
      setErrorMessage(t("nameRequired"));
      setIsSaving(false);
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
      stock_quantity: trackStock
        ? Math.max(0, Number(stockQuantity) || 0)
        : 0,
    };

    try {
      if (mode === "create") {
        const res = await fetch("/api/products/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error(t("saveError"));
      } else {
        const { error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", productId);

        if (error) throw error;
      }

      router.push(`/${locale}/admin/products`);
      router.refresh();
    } catch (error: any) {
      setErrorMessage(error.message || t("saveError"));
    }

    setIsSaving(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-6 lg:grid-cols-[1fr_360px]"
    >
      <div className="glass-card p-6">
        <h2 className="text-2xl font-black text-dark">
          {mode === "create" ? t("formTitleCreate") : t("formTitleEdit")}
        </h2>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <input
            className="input-field sm:col-span-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("productName")}
            required
          />

          <input
            className="input-field"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder={t("subtitle")}
          />

          <input
            className="input-field"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={t("priceKr")}
            type="number"
            required
          />

          <select
            className="input-field"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="maczanka">Maczanka</option>
            <option value="knysza">Knysza</option>
            <option value="sides">Sides</option>
            <option value="drinks">Drinks</option>
          </select>

          <textarea
            className="input-field sm:col-span-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("description")}
            required
          />

          <input
            className="input-field"
            value={badge}
            onChange={(e) => setBadge(e.target.value)}
            placeholder={t("badge")}
          />
        </div>

        {errorMessage && (
          <div className="mt-4 text-sm font-bold text-red-500">
            {errorMessage}
          </div>
        )}
      </div>

      <aside className="glass-card p-6">
        <h3 className="font-black">{t("productPhoto")}</h3>

        {imageUrl && (
          <div className="relative mt-4 h-48 w-full overflow-hidden rounded-2xl bg-white/70">
            <Image
              src={imageUrl}
              alt={name || "Preview"}
              fill
              sizes="360px"
              className="object-contain p-4"
            />
          </div>
        )}

        <label className="mt-4 flex cursor-pointer items-center gap-2 rounded-2xl bg-dark px-4 py-3 text-sm font-black text-white transition hover:opacity-90">
          <Upload size={18} />
          {isUploading ? t("uploading") : t("uploadPhoto")}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            disabled={isUploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
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
            ? mode === "create"
              ? common("creatingAndTranslating")
              : common("saving")
            : mode === "create"
              ? common("createProduct")
              : common("saveChanges")}
        </button>
      </aside>
    </form>
  );
}