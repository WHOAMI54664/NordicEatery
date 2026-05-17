import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import {
  ChefHat,
  CircleDot,
  Eye,
  EyeOff,
  Package,
  Plus,
  Sparkles
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { canManageProducts } from "@/lib/auth/roles";
import { ProductActions } from "@/components/admin/ProductActions";


type Product = {
  id: string;
  name: string;
  subtitle?: string | null;
  description?: string | null;
  price: number;
  category?: string | null;
  image_url?: string | null;
  badge?: string | null;
  is_available: boolean;
  is_popular?: boolean | null;
  track_stock?: boolean | null;
  stock_quantity?: number | null;
  sort_order?: number | null;
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0
  }).format(Number(price || 0));
}

function getStockLabel(product: Product) {
  if (!product.track_stock) return "Not tracked";

  const quantity = Number(product.stock_quantity || 0);

  if (quantity <= 0) return "Out of stock";
  if (quantity <= 5) return `${quantity} left`;

  return `${quantity} in stock`;
}

function getStockClass(product: Product) {
  if (!product.track_stock) {
    return "border-[#EADDCF] bg-[#FFF3E2] text-[#7B6A61]";
  }

  const quantity = Number(product.stock_quantity || 0);

  if (quantity <= 0) {
    return "border-[#E51B23]/20 bg-[#E51B23]/8 text-[#C7192E]";
  }

  if (quantity <= 5) {
    return "border-[#F6A21A]/25 bg-[#F6A21A]/15 text-[#A96800]";
  }

  return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700";
}

function getCategoryLabel(category?: string | null) {
  if (!category) return "Uncategorized";

  return category
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
}

export default async function AdminProductsPage({
                                                  params
                                                }: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const t = await getTranslations("admin.products");
  const common = await getTranslations("admin.common");

  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/login?next=/${locale}/admin/products`);

  const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

  if (!canManageProducts(profile?.role)) redirect(`/${locale}/unauthorized`);

  const { data: products } = await supabase
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true });

  const productList = (products || []) as Product[];

  const totalProducts = productList.length;
  const activeProducts = productList.filter(
      (product) => product.is_available
  ).length;
  const hiddenProducts = productList.filter(
      (product) => !product.is_available
  ).length;
  const lowStockProducts = productList.filter((product) => {
    if (!product.track_stock) return false;

    return Number(product.stock_quantity || 0) <= 5;
  }).length;

  return (
        <div className="space-y-6">
          <section className="relative hidden overflow-hidden rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-2xl shadow-[#4C2314]/10 backdrop-blur-2xl lg:block lg:p-6">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(229,27,35,0.09),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(255,159,64,0.16),transparent_34%)]" />

            <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="inline-flex rounded-full border border-[#E51B23]/15 bg-[#E51B23]/8 px-3 py-1 text-xs font-black text-[#C7192E]">
                  {common("admin")}
                </div>

                <h1 className="mt-4 text-4xl font-black tracking-[-0.055em] text-[#25120F] md:text-5xl">
                  {t("title")}
                </h1>

                <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[#7B6A61]">
                  Manage dishes, prices, stock and availability for your menu.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                    href={`/${locale}/admin/products/new`}
                    className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#E51B23] px-5 text-sm font-black text-white shadow-lg shadow-[#E51B23]/20 transition hover:bg-[#C7192E]"
                >
                  <Plus size={18} />
                  {t("addProduct")}
                </Link>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
            <div className="relative overflow-hidden rounded-[1.5rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-4 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl md:rounded-[1.75rem] md:p-5">
              <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-[#E51B23]/8 blur-2xl md:-right-12 md:-top-12 md:h-32 md:w-32" />

              <div className="relative flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-black leading-4 text-[#8A7A70] sm:text-sm">
                    Total products
                  </p>

                  <h3 className="mt-2 text-2xl font-black tracking-[-0.055em] text-[#25120F] md:mt-3 md:text-3xl">
                    {totalProducts}
                  </h3>
                </div>

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[#E51B23]/15 bg-[#E51B23]/8 md:h-11 md:w-11">
                  <ChefHat className="h-4 w-4 text-[#C7192E] md:h-5 md:w-5" />
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[1.5rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-4 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl md:rounded-[1.75rem] md:p-5">
              <div className="relative flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-black leading-4 text-[#8A7A70] sm:text-sm">
                    Active products
                  </p>

                  <h3 className="mt-2 text-2xl font-black tracking-[-0.055em] text-[#25120F] md:mt-3 md:text-3xl">
                    {activeProducts}
                  </h3>
                </div>

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 md:h-11 md:w-11">
                  <Eye className="h-4 w-4 text-emerald-700 md:h-5 md:w-5" />
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[1.5rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-4 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl md:rounded-[1.75rem] md:p-5">
              <div className="relative flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-black leading-4 text-[#8A7A70] sm:text-sm">
                    Hidden products
                  </p>

                  <h3 className="mt-2 text-2xl font-black tracking-[-0.055em] text-[#25120F] md:mt-3 md:text-3xl">
                    {hiddenProducts}
                  </h3>
                </div>

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[#EADDCF] bg-[#FFF3E2] md:h-11 md:w-11">
                  <EyeOff className="h-4 w-4 text-[#7B6A61] md:h-5 md:w-5" />
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[1.5rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-4 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl md:rounded-[1.75rem] md:p-5">
              <div className="relative flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-black leading-4 text-[#8A7A70] sm:text-sm">
                    Low stock
                  </p>

                  <h3 className="mt-2 text-2xl font-black tracking-[-0.055em] text-[#25120F] md:mt-3 md:text-3xl">
                    {lowStockProducts}
                  </h3>
                </div>

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[#F6A21A]/25 bg-[#F6A21A]/15 md:h-11 md:w-11">
                  <Package className="h-4 w-4 text-[#A96800] md:h-5 md:w-5" />
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/88 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl">
            <div className="flex flex-col gap-3 border-b border-[#EADDCF] px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <h2 className="text-xl font-black tracking-[-0.03em] text-[#25120F]">
                  Product catalogue
                </h2>

                <p className="mt-1 text-sm font-medium text-[#7B6A61]">
                  Current products from Supabase.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-2xl border border-[#EADDCF] bg-white/70 px-4 py-2 text-sm font-black text-[#7B6A61]">
                <CircleDot className="h-4 w-4 text-[#C7192E]" />
                {totalProducts} items
              </div>
            </div>

            {productList.length === 0 ? (
                <div className="px-4 py-5 sm:px-5">
                  <div className="rounded-[1.5rem] border border-dashed border-[#EADDCF] bg-white/60 p-8 text-center">
                    <p className="text-sm font-black text-[#25120F]">
                      No products found
                    </p>

                    <p className="mt-2 text-sm font-medium text-[#7B6A61]">
                      Add your first product to start building the menu.
                    </p>

                    <Link
                        href={`/${locale}/admin/products/new`}
                        className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#E51B23] px-5 text-sm font-black text-white shadow-lg shadow-[#E51B23]/20 transition hover:bg-[#C7192E]"
                    >
                      <Plus size={18} />
                      {t("addProduct")}
                    </Link>
                  </div>
                </div>
            ) : (
                <>
                  {/* MOBILE: карточки товаров */}
                  <div className="space-y-3 p-3 sm:p-4 lg:hidden">
                    {productList.map((product) => (
                        <article
                            key={product.id}
                            className="rounded-[1.5rem] border border-[#EADDCF] bg-white/72 p-3.5 shadow-sm shadow-[#4C2314]/6"
                        >
                          <div className="flex gap-3">
                            <div className="relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-[1.2rem] border border-[#EADDCF] bg-[#FFF7EA]">
                              {product.image_url ? (
                                  <Image
                                      src={product.image_url}
                                      alt={product.name}
                                      fill
                                      sizes="76px"
                                      className="object-cover"
                                  />
                              ) : (
                                  <div className="flex h-full items-center justify-center text-2xl">
                                    🍽️
                                  </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <h3 className="text-sm font-black leading-5 text-[#25120F]">
                                      {product.name}
                                    </h3>

                                    {product.is_popular ? (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-[#F6A21A]/25 bg-[#F6A21A]/15 px-2 py-0.5 text-[10px] font-black text-[#A96800]">
                          <Sparkles className="h-2.5 w-2.5" />
                          Popular
                        </span>
                                    ) : null}
                                  </div>

                                  <p className="mt-1 line-clamp-2 text-xs font-semibold leading-4 text-[#7B6A61]">
                                    {product.subtitle ||
                                        product.description ||
                                        "No description"}
                                  </p>
                                </div>

                                <p className="shrink-0 text-sm font-black text-[#C7192E]">
                                  {formatPrice(product.price)}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-[#EADDCF] bg-[#FFF3E2] px-2.5 py-1 text-[11px] font-black text-[#7B6A61]">
                {getCategoryLabel(product.category)}
              </span>

                            <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${getStockClass(
                                    product
                                )}`}
                            >
                {getStockLabel(product)}
              </span>

                            {product.is_available ? (
                                <span className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-black text-emerald-700">
                  {common("active")}
                </span>
                            ) : (
                                <span className="inline-flex rounded-full border border-[#E51B23]/15 bg-[#E51B23]/8 px-2.5 py-1 text-[11px] font-black text-[#C7192E]">
                  {common("hidden")}
                </span>
                            )}

                            {product.badge ? (
                                <span className="rounded-full border border-[#E51B23]/15 bg-[#E51B23]/8 px-2.5 py-1 text-[11px] font-black text-[#C7192E]">
                  {product.badge}
                </span>
                            ) : null}
                          </div>

                          <div className="mt-3 flex items-center gap-2 border-t border-[#EADDCF] pt-3">
                            <Link
                                href={`/${locale}/admin/products/${product.id}/edit`}
                                className="flex h-10 flex-1 items-center justify-center rounded-2xl border border-[#EADDCF] bg-white px-4 text-sm font-black text-[#25120F] shadow-sm shadow-[#4C2314]/5 transition hover:border-[#E51B23]/20 hover:text-[#C7192E]"
                            >
                              {common("edit")}
                            </Link>

                            <ProductActions
                                productId={product.id}
                                isAvailable={product.is_available}
                            />
                          </div>
                        </article>
                    ))}
                  </div>

                  {/* DESKTOP: старая таблица */}
                  <div className="hidden overflow-x-auto lg:block">
                    <table className="w-full min-w-[980px] border-separate border-spacing-y-2 px-5 py-3 text-left">
                      <thead>
                      <tr className="text-xs uppercase tracking-[0.16em] text-[#A39388]">
                        <th className="px-4 py-2 font-black">{t("photo")}</th>
                        <th className="px-4 py-2 font-black">{t("name")}</th>
                        <th className="px-4 py-2 font-black">Category</th>
                        <th className="px-4 py-2 font-black">{t("price")}</th>
                        <th className="px-4 py-2 font-black">Stock</th>
                        <th className="px-4 py-2 font-black">{t("status")}</th>
                        <th className="px-4 py-2 text-right font-black">Actions</th>
                      </tr>
                      </thead>

                      <tbody>
                      {productList.map((product) => (
                          <tr key={product.id} className="group">
                            <td className="rounded-l-2xl border-y border-l border-[#EADDCF] bg-white/70 px-4 py-4 group-hover:bg-[#FFF3E2]">
                              <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-[#EADDCF] bg-[#FFF7EA]">
                                {product.image_url ? (
                                    <Image
                                        src={product.image_url}
                                        alt={product.name}
                                        fill
                                        sizes="64px"
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full items-center justify-center text-2xl">
                                      🍽️
                                    </div>
                                )}
                              </div>
                            </td>

                            <td className="border-y border-[#EADDCF] bg-white/70 px-4 py-4 group-hover:bg-[#FFF3E2]">
                              <div className="flex flex-col">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-black text-[#25120F]">
                                    {product.name}
                                  </p>

                                  {product.is_popular ? (
                                      <span className="inline-flex items-center gap-1 rounded-full border border-[#F6A21A]/25 bg-[#F6A21A]/15 px-2.5 py-1 text-[11px] font-black text-[#A96800]">
                          <Sparkles className="h-3 w-3" />
                          Popular
                        </span>
                                  ) : null}

                                  {product.badge ? (
                                      <span className="rounded-full border border-[#E51B23]/15 bg-[#E51B23]/8 px-2.5 py-1 text-[11px] font-black text-[#C7192E]">
                          {product.badge}
                        </span>
                                  ) : null}
                                </div>

                                <p className="mt-1 line-clamp-1 max-w-[360px] text-sm font-medium text-[#7B6A61]">
                                  {product.subtitle ||
                                      product.description ||
                                      "No description"}
                                </p>
                              </div>
                            </td>

                            <td className="border-y border-[#EADDCF] bg-white/70 px-4 py-4 group-hover:bg-[#FFF3E2]">
                  <span className="rounded-full border border-[#EADDCF] bg-[#FFF3E2] px-3 py-1 text-xs font-black text-[#7B6A61]">
                    {getCategoryLabel(product.category)}
                  </span>
                            </td>

                            <td className="border-y border-[#EADDCF] bg-white/70 px-4 py-4 text-sm font-black text-[#C7192E] group-hover:bg-[#FFF3E2]">
                              {formatPrice(product.price)}
                            </td>

                            <td className="border-y border-[#EADDCF] bg-white/70 px-4 py-4 group-hover:bg-[#FFF3E2]">
                  <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${getStockClass(
                          product
                      )}`}
                  >
                    {getStockLabel(product)}
                  </span>
                            </td>

                            <td className="border-y border-[#EADDCF] bg-white/70 px-4 py-4 group-hover:bg-[#FFF3E2]">
                              {product.is_available ? (
                                  <span className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-700">
                      {common("active")}
                    </span>
                              ) : (
                                  <span className="inline-flex rounded-full border border-[#E51B23]/15 bg-[#E51B23]/8 px-3 py-1 text-xs font-black text-[#C7192E]">
                      {common("hidden")}
                    </span>
                              )}
                            </td>

                            <td className="rounded-r-2xl border-y border-r border-[#EADDCF] bg-white/70 px-4 py-4 group-hover:bg-[#FFF3E2]">
                              <div className="flex items-center justify-end gap-3">
                                <Link
                                    href={`/${locale}/admin/products/${product.id}/edit`}
                                    className="rounded-2xl border border-[#EADDCF] bg-white px-4 py-2 text-sm font-black text-[#25120F] shadow-sm shadow-[#4C2314]/5 transition hover:border-[#E51B23]/20 hover:text-[#C7192E]"
                                >
                                  {common("edit")}
                                </Link>

                                <ProductActions
                                    productId={product.id}
                                    isAvailable={product.is_available}
                                />
                              </div>
                            </td>
                          </tr>
                      ))}
                      </tbody>
                    </table>
                  </div>
                </>
            )}
          </section>
        </div>
  );
}
