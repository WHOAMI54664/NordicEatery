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
  Search,
  Sparkles
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { canManageProducts } from "@/lib/auth/roles";
import { ProductActions } from "@/components/admin/ProductActions";
import { AdminShell } from "@/components/admin/AdminShell";

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
      <AdminShell>
        <div className="space-y-6">
          <section className="relative overflow-hidden rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-2xl shadow-[#4C2314]/10 backdrop-blur-2xl lg:p-6">
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
                <label className="flex h-12 min-w-0 items-center gap-3 rounded-2xl border border-[#EADDCF] bg-white/75 px-4 text-[#7B6A61] shadow-inner shadow-[#4C2314]/5 sm:w-[340px]">
                  <Search className="h-4 w-4 shrink-0" />
                  <input
                      type="text"
                      placeholder="Search products..."
                      className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[#25120F] outline-none placeholder:text-[#A39388]"
                  />
                </label>

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

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="relative overflow-hidden rounded-[1.75rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl">
              <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[#E51B23]/8 blur-2xl" />

              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-[#8A7A70]">
                    Total products
                  </p>
                  <h3 className="mt-3 text-3xl font-black tracking-[-0.055em] text-[#25120F]">
                    {totalProducts}
                  </h3>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E51B23]/15 bg-[#E51B23]/8">
                  <ChefHat className="h-5 w-5 text-[#C7192E]" />
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[1.75rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl">
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-[#8A7A70]">
                    Active products
                  </p>
                  <h3 className="mt-3 text-3xl font-black tracking-[-0.055em] text-[#25120F]">
                    {activeProducts}
                  </h3>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
                  <Eye className="h-5 w-5 text-emerald-700" />
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[1.75rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl">
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-[#8A7A70]">
                    Hidden products
                  </p>
                  <h3 className="mt-3 text-3xl font-black tracking-[-0.055em] text-[#25120F]">
                    {hiddenProducts}
                  </h3>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#EADDCF] bg-[#FFF3E2]">
                  <EyeOff className="h-5 w-5 text-[#7B6A61]" />
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[1.75rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl">
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-[#8A7A70]">
                    Low stock
                  </p>
                  <h3 className="mt-3 text-3xl font-black tracking-[-0.055em] text-[#25120F]">
                    {lowStockProducts}
                  </h3>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#F6A21A]/25 bg-[#F6A21A]/15">
                  <Package className="h-5 w-5 text-[#A96800]" />
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/88 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl">
            <div className="flex flex-col gap-3 border-b border-[#EADDCF] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
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

            <div className="overflow-x-auto">
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
                            {product.subtitle || product.description || "No description"}
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

              {productList.length === 0 ? (
                  <div className="px-5 pb-5">
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
              ) : null}
            </div>
          </section>
        </div>
      </AdminShell>
  );
}