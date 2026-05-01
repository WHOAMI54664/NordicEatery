import { redirect } from "next/navigation";
import { PackageSearch } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AdminShell } from "@/components/admin/AdminShell";
import { InventoryManager } from "@/components/admin/InventoryManager";
import { createClient } from "@/lib/supabase/server";
import { canManageInventory } from "@/lib/auth/roles";

type InventoryPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function InventoryPage({ params }: InventoryPageProps) {
  const { locale } = await params;

  const t = await getTranslations("admin");

  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?next=/${locale}/admin/inventory`);
  }

  const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

  if (!canManageInventory(profile?.role)) {
    redirect(`/${locale}/unauthorized`);
  }

  const { data: products } = await supabase
      .from("products")
      .select(
          "id, name, subtitle, category, price, image_url, is_available, track_stock, stock_quantity"
      )
      .order("sort_order", { ascending: true });

  return (
      <AdminShell>
        <div className="space-y-6">
          <section className="relative overflow-hidden rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-2xl shadow-[#4C2314]/10 backdrop-blur-2xl lg:p-6">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(229,27,35,0.09),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(255,159,64,0.16),transparent_34%)]" />

            <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#E51B23]/15 bg-[#E51B23]/8 px-3 py-1 text-xs font-black text-[#C7192E]">
                  <PackageSearch className="h-3.5 w-3.5" />
                  {t("inventory.eyebrow")}
                </div>

                <h1 className="mt-4 text-4xl font-black tracking-[-0.055em] text-[#25120F] md:text-5xl">
                  {t("inventory.title")}
                </h1>

                <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[#7B6A61]">
                  {t("inventory.subtitle")}
                </p>
              </div>

              <div className="flex h-12 items-center gap-2 rounded-2xl border border-[#EADDCF] bg-white/70 px-4 text-sm font-black text-[#7B6A61]">
                <PackageSearch className="h-4 w-4 text-[#C7192E]" />
                {t("inventory.productsCount", {
                  count: products?.length || 0
                })}
              </div>
            </div>
          </section>

          <InventoryManager products={products || []} />
        </div>
      </AdminShell>
  );
}