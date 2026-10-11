"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  BadgePercent,
  CheckCircle2,
  Eye,
  EyeOff,
  ImagePlus,
  Package,
  Save,
  Sparkles,
  Upload,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/browser";

import { EditableText } from "@/components/EditableText";
import { useSiteContent } from "@/components/site-content/SiteContentProvider";
import { getMenuCategories } from "@/lib/menu-display";
import { ModifierGroupsEditor } from "@/components/admin/ModifierGroupsEditor";
import { parseModifierGroups, type ModifierGroup } from "@/lib/menu-options";

type MenuType = "standard" | "vegan" | "gluten_free";

const DEFAULT_CATEGORIES = ["maczanka", "knysza", "fries", "sauces", "drinks"];

const NEW_CATEGORY_VALUE = "__new__";

// Normalizes a typed category name into a stable slug, e.g. "Fika" -> "fika",
// "Glass & Dessert" -> "glass-dessert". Matches the menu's category ids.
function slugifyCategory(value: string) {
  return value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
}

type ProductFormValues = {
  modifier_groups?: ModifierGroup[] | null;
  id?: string;
  name?: string;
  subtitle?: string;
  description?: string;
  price?: number;
  category?: string;
  menu_type?: MenuType | null;
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

function FieldLabel({
                      children,
                      icon: Icon,
                    }: {
  children: React.ReactNode;
  icon?: React.ElementType;
}) {
  return (
      <label className="space-y-2">
      <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#A39388]">
        {Icon ? <Icon className="h-3.5 w-3.5 text-[#C7192E]" /> : null}
        {children}
      </span>
      </label>
  );
}

function ToggleCard({
                      checked,
                      onChange,
                      title,
                      description,
                      activeIcon: ActiveIcon,
                      inactiveIcon: InactiveIcon,
                    }: {
  checked: boolean;
  onChange: (value: boolean) => void;
  title: string;
  description: string;
  activeIcon: React.ElementType;
  inactiveIcon?: React.ElementType;
}) {
  const Icon = checked ? ActiveIcon : InactiveIcon || ActiveIcon;

  return (
      <button
          type="button"
          onClick={() => onChange(!checked)}
          className={`flex h-full flex-col gap-3 rounded-2xl border p-4 text-left transition ${
              checked
                  ? "border-[#E51B23]/20 bg-[#E51B23]/8 shadow-sm shadow-[#E51B23]/10"
                  : "border-[#EADDCF] bg-white/70 hover:bg-[#FFF3E2]"
          }`}
      >
      <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
              checked
                  ? "border-[#E51B23]/15 bg-white/70 text-[#C7192E]"
                  : "border-[#EADDCF] bg-[#FFF7EA] text-[#7B6A61]"
          }`}
      >
        <Icon className="h-4 w-4" />
      </span>

        <span>
        <span className="block text-sm font-black text-[#25120F]">
          {title}
        </span>
        <span className="mt-1 block text-xs font-medium leading-5 text-[#7B6A61]">
          {description}
        </span>
      </span>
      </button>
  );
}

export function ProductForm({
                              mode,
                              product,
                              locale = "en",
                            }: ProductFormProps) {
  const t = useTranslations("admin.products");
  const common = useTranslations("admin.common");
  const categoryTranslations = useTranslations("pages.menu.categories");
  const { canEdit, content, changes, setCopy } = useSiteContent();

  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>(product?.modifier_groups || []);
  const [name, setName] = useState(product?.name || "");
  const [subtitle, setSubtitle] = useState(product?.subtitle || "");
  const [description, setDescription] = useState(product?.description || "");
  const [price, setPrice] = useState(String(product?.price || ""));
  const [category, setCategory] = useState(product?.category || "maczanka");
  const [existingCategories, setExistingCategories] = useState<string[]>([]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  // Collect every category currently used by products so the dropdown offers
  // them alongside the defaults (no separate categories table needed).
  useEffect(() => {
    let isMounted = true;

    async function loadCategories() {
      const { data } = await supabase.from("products").select("category");

      if (!isMounted || !data) return;

      const unique = Array.from(
          new Set(
              data
                  .map((row) => (row.category || "").trim())
                  .filter(Boolean)
          )
      );

      setExistingCategories(unique);
    }

    loadCategories();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  const categoryOptions = useMemo(() => {
    const merged = [
      ...DEFAULT_CATEGORIES,
      ...existingCategories,
      ...(product?.category ? [product.category] : []),
    ];

    return Array.from(new Set(merged.map((value) => value.trim()).filter(Boolean)));
  }, [existingCategories, product?.category]);
  const categoryLabels = getMenuCategories(
    categoryOptions.map((category) => ({ category })),
    { ...content, ...changes },
    (id) => categoryTranslations(id),
  );
  const selectedCategory = categoryLabels.find((option) => option.id === category);
  const [menuType, setMenuType] = useState<MenuType>(
      product?.menu_type || "standard"
  );
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

    const effectiveCategory = isAddingCategory
        ? slugifyCategory(newCategory)
        : category;

    if (!effectiveCategory) {
      setErrorMessage("Please choose or enter a category.");
      setIsSaving(false);
      return;
    }

    try { parseModifierGroups(modifierGroups); } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("saveError"));
      setIsSaving(false);
      return;
    }
    const payload = {
      locale,
      modifier_groups: modifierGroups,
      id: productId,
      name,
      subtitle,
      description,
      price: Number(price),
      category: effectiveCategory,
      menu_type: menuType,
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

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.details || data?.error || t("saveError"));
        }
      } else {

        const res = await fetch("/api/products/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.details || data?.error || t("saveError"));
        }
      }

      router.push(`/${locale}/admin/products`);
      router.refresh();
    } catch (error: any) {
      setErrorMessage(error.message || t("saveError"));
    } finally {
      setIsSaving(false);
    }
  }

  const inputClass =
      "h-12 w-full rounded-2xl border border-[#EADDCF] bg-white/75 px-4 text-sm font-semibold text-[#25120F] outline-none shadow-inner shadow-[#4C2314]/5 transition placeholder:text-[#A39388] focus:border-[#E51B23]/25 focus:bg-white focus:ring-4 focus:ring-[#E51B23]/8";

  const textareaClass =
      "min-h-32 w-full rounded-2xl border border-[#EADDCF] bg-white/75 px-4 py-3 text-sm font-semibold text-[#25120F] outline-none shadow-inner shadow-[#4C2314]/5 transition placeholder:text-[#A39388] focus:border-[#E51B23]/25 focus:bg-white focus:ring-4 focus:ring-[#E51B23]/8";

  return (
      <form
          onSubmit={handleSubmit}
          className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"
      >
        <section className="rounded-[1.75rem] border border-[#EADDCF] bg-white/55 p-5 shadow-sm shadow-[#4C2314]/5 lg:p-6">
          <div className="flex flex-col gap-3 border-b border-[#EADDCF] pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-3xl font-black tracking-[-0.05em] text-[#25120F]">
                {mode === "create" ? t("formTitleCreate") : t("formTitleEdit")}
              </h2>
              <p className="mt-2 text-sm font-medium text-[#7B6A61]">
                Basic product information used across the menu, cart and admin.
              </p>
            </div>

            <span className="inline-flex items-center gap-2 rounded-full border border-[#E51B23]/15 bg-[#E51B23]/8 px-3 py-1 text-xs font-black text-[#C7192E]">
            <BadgePercent className="h-3.5 w-3.5" />
              {mode === "create" ? "New product" : "Editing"}
          </span>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FieldLabel>{t("productName")}</FieldLabel>
              <input
                  className={inputClass}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("productName")}
                  required
              />
            </div>

            <div>
              <FieldLabel>{t("subtitleOptional")}</FieldLabel>
              <input
                  className={inputClass}
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder={t("subtitleOptional")}
              />
            </div>

            <div>
              <FieldLabel>{t("priceKr")}</FieldLabel>
              <input
                  className={inputClass}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={t("priceKr")}
                  type="number"
                  required
              />
            </div>

            <div>
              <FieldLabel>Menu type</FieldLabel>
              <select
                  className={inputClass}
                  value={menuType}
                  onChange={(e) => setMenuType(e.target.value as MenuType)}
              >
                <option value="standard">Standard</option>
                <option value="vegan">Vegan</option>
                <option value="gluten_free">Gluten Free</option>
              </select>
            </div>

            <div>
              <FieldLabel>{t("category")}</FieldLabel>
              <select
                  className={inputClass}
                  aria-label={t("category")}
                  value={isAddingCategory ? NEW_CATEGORY_VALUE : category}
                  onChange={(e) => {
                    if (e.target.value === NEW_CATEGORY_VALUE) {
                      setIsAddingCategory(true);
                      setNewCategory("");
                    } else {
                      setIsAddingCategory(false);
                      setCategory(e.target.value);
                    }
                  }}
              >
                {categoryLabels.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.title}
                    </option>
                ))}
                <option value={NEW_CATEGORY_VALUE}>+ New category…</option>
              </select>

              {!isAddingCategory && selectedCategory && canEdit ? (
                  <div className="mt-3 text-sm text-[#7B6A61]">
                    <p className="font-semibold">{t("editCategoryName")}</p>
                    <EditableText
                      key={selectedCategory.id}
                      value={selectedCategory.title}
                      textKey={selectedCategory.textKey}
                      locale={locale}
                      page="menu"
                      canEdit
                      className="mt-1 block font-bold text-[#25120F]"
                      onSaved={(value) => {
                        setCopy(selectedCategory.textKey, value);
                        router.refresh();
                      }}
                    />
                    <p className="mt-1 text-xs">{t("categoryNameHint")}</p>
                  </div>
              ) : null}

              {isAddingCategory ? (
                  <input
                      className={`${inputClass} mt-2`}
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="e.g. Fika"
                      autoFocus
                  />
              ) : null}
            </div>

            <div>
              <FieldLabel>{t("badge")}</FieldLabel>
              <input
                  className={inputClass}
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  placeholder={t("badge")}
              />
            </div>

            <div className="sm:col-span-2">
              <FieldLabel>{t("description")}</FieldLabel>
              <textarea
                  className={textareaClass}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("description")}
                  required
              />
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <ToggleCard
                checked={isAvailable}
                onChange={setIsAvailable}
                title="Available"
                description="Show this product to customers."
                activeIcon={Eye}
                inactiveIcon={EyeOff}
            />

            <ToggleCard
                checked={isPopular}
                onChange={setIsPopular}
                title="Popular"
                description="Mark as a highlighted menu item."
                activeIcon={Sparkles}
            />

            <ToggleCard
                checked={trackStock}
                onChange={setTrackStock}
                title="Track stock"
                description="Use inventory quantity for this item."
                activeIcon={Package}
            />
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <FieldLabel>Stock quantity</FieldLabel>
              <input
                  className={inputClass}
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  placeholder="0"
                  type="number"
                  min="0"
                  disabled={!trackStock}
              />
            </div>

            <div>
              <FieldLabel>Sort order</FieldLabel>
              <input
                  className={inputClass}
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  placeholder="0"
                  type="number"
              />
            </div>
          </div>

          {errorMessage ? (
              <div className="mt-5 rounded-2xl border border-[#E51B23]/15 bg-[#E51B23]/8 px-4 py-3 text-sm font-bold text-[#C7192E]">
                {errorMessage}
              </div>
          ) : null}
          <ModifierGroupsEditor value={modifierGroups} onChange={setModifierGroups} />
        </section>

        <aside className="rounded-[1.75rem] border border-[#EADDCF] bg-white/55 p-5 shadow-sm shadow-[#4C2314]/5 lg:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-2xl font-black tracking-[-0.04em] text-[#25120F]">
                {t("productPhoto")}
              </h3>
              <p className="mt-2 text-sm font-medium text-[#7B6A61]">
                Upload a clean product image for the menu and ordering page.
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E51B23]/15 bg-[#E51B23]/8">
              <ImagePlus className="h-5 w-5 text-[#C7192E]" />
            </div>
          </div>

          <div className="mt-6">
            {imageUrl ? (
                <div className="relative h-72 w-full overflow-hidden rounded-[1.5rem] border border-[#EADDCF] bg-white/80">
                  <Image
                      src={imageUrl}
                      alt={name || "Preview"}
                      fill
                      sizes="460px"
                      className="object-contain p-6"
                  />
                </div>
            ) : (
                <div className="flex h-72 w-full flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-[#EADDCF] bg-white/60 px-5 text-center">
                  <ImagePlus className="h-9 w-9 text-[#C7192E]" />

                  <p className="mt-3 text-sm font-black text-[#25120F]">
                    No image selected
                  </p>

                  <p className="mt-2 max-w-72 text-xs font-bold leading-5 text-[#7B6A61]">
                    JPG or WEBP recommended.
                    <br />
                    Size: 800×800 px or 900×700 px.
                    <br />
                    Best weight: 100–300 KB.
                    <br />
                    Max file size: 500 KB.
                  </p>

                  <p className="mt-2 text-[11px] font-black uppercase tracking-[0.12em] text-[#C7192E]">
                    Avoid heavy PNG files
                  </p>
                </div>
            )}
          </div>

          <label className="mt-5 flex h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[#E51B23]/15 bg-[#E51B23]/8 px-4 text-sm font-black text-[#C7192E] transition hover:bg-[#E51B23]/12">
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
              className="mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[#E51B23] px-5 py-4 text-sm font-black text-white shadow-lg shadow-[#E51B23]/20 transition hover:bg-[#C7192E] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {isSaving
                ? mode === "create"
                    ? common("creatingAndTranslating")
                    : common("saving")
                : mode === "create"
                    ? common("createProduct")
                    : common("saveChanges")}
          </button>

          <div className="mt-5 rounded-2xl border border-[#EADDCF] bg-[#FFF7EA]/80 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              <p className="text-sm font-black text-[#25120F]">
                Product status
              </p>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
            <span
                className={`rounded-full border px-3 py-1 text-xs font-black ${
                    isAvailable
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                        : "border-[#E51B23]/15 bg-[#E51B23]/8 text-[#C7192E]"
                }`}
            >
              {isAvailable ? "Available" : "Hidden"}
            </span>

              <span className="rounded-full border border-[#EADDCF] bg-white/80 px-3 py-1 text-xs font-black text-[#7B6A61]">
              {menuType === "gluten_free" ? "Gluten Free" : menuType}
            </span>

              <span className="rounded-full border border-[#EADDCF] bg-white/80 px-3 py-1 text-xs font-black text-[#7B6A61]">
              {category}
            </span>

              {isPopular ? (
                  <span className="rounded-full border border-[#F6A21A]/25 bg-[#F6A21A]/15 px-3 py-1 text-xs font-black text-[#A96800]">
                Popular
              </span>
              ) : null}

              {trackStock ? (
                  <span className="rounded-full border border-[#EADDCF] bg-white/80 px-3 py-1 text-xs font-black text-[#7B6A61]">
                Stock: {stockQuantity || 0}
              </span>
              ) : (
                  <span className="rounded-full border border-[#EADDCF] bg-white/80 px-3 py-1 text-xs font-black text-[#7B6A61]">
                Stock not tracked
              </span>
              )}
            </div>
          </div>
        </aside>
      </form>
  );
}
