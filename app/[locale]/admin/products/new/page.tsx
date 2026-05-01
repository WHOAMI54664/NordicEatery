import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ChefHat, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ProductForm } from "@/components/admin/ProductForm";
import { canManageProducts } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function NewProductPage({
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

  if (!user) redirect(`/${locale}/login?next=/${locale}/admin/products/new`);

  const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

  if (!canManageProducts(profile?.role)) redirect(`/${locale}/unauthorized`);

  return (
      <AdminShell>
        <div className="space-y-6">
          <section className="relative overflow-hidden rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-2xl shadow-[#4C2314]/10 backdrop-blur-2xl lg:p-6">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(229,27,35,0.09),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(255,159,64,0.16),transparent_34%)]" />

            <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#E51B23]/15 bg-[#E51B23]/8 px-3 py-1 text-xs font-black text-[#C7192E]">
                  <ChefHat className="h-3.5 w-3.5" />
                  {common("admin")}
                </div>

                <h1 className="mt-4 text-4xl font-black tracking-[-0.055em] text-[#25120F] md:text-5xl">
                  {t("addProduct")}
                </h1>

                <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[#7B6A61]">
                  Create a new dish, set pricing, availability, stock and menu
                  visibility.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex h-12 items-center gap-2 rounded-2xl border border-[#EADDCF] bg-white/70 px-4 text-sm font-black text-[#7B6A61]">
                  <ShieldCheck className="h-4 w-4 text-[#C7192E]" />
                  Product manager
                </div>

                <Link
                    href={`/${locale}/admin/products`}
                    className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#EADDCF] bg-white/80 px-5 text-sm font-black text-[#25120F] shadow-sm shadow-[#4C2314]/5 transition hover:border-[#E51B23]/20 hover:text-[#C7192E]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to products
                </Link>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl lg:p-6">
            <div className="mb-6 border-b border-[#EADDCF] pb-5">
              <h2 className="text-xl font-black tracking-[-0.03em] text-[#25120F]">
                Product details
              </h2>
              <p className="mt-1 text-sm font-medium text-[#7B6A61]">
                Fill in the information below and save the product.
              </p>
            </div>

            <ProductForm mode="create" locale={locale} />
          </section>
        </div>
      </AdminShell>
  );
}