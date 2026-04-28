import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ProductForm } from "@/components/admin/ProductForm";
import { canManageProducts } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export default async function NewProductPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const t = await getTranslations("admin.products");
  const common = await getTranslations("admin.common");

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/login?next=/${locale}/admin/products/new`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!canManageProducts(profile?.role)) redirect(`/${locale}/unauthorized`);

  return (
    <main className="container-page py-12">
      <div className="mb-10">
        <p className="font-black uppercase tracking-[0.25em] text-paprika">
          {common("admin")}
        </p>
        <h1 className="section-title mt-3">{t("addProduct")}</h1>
      </div>

      <ProductForm mode="create" locale={locale} />
    </main>
  );
}