import { redirect } from "next/navigation";
import { InventoryManager } from "@/components/admin/InventoryManager";
import { createClient } from "@/lib/supabase/server";
import { canManageInventory } from "@/lib/auth/roles";

export default async function InventoryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/admin/inventory");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!canManageInventory(profile?.role)) redirect("/unauthorized");

  const { data: products } = await supabase
    .from("products")
    .select(
      "id, name, subtitle, category, price, image_url, is_available, track_stock, stock_quantity"
    )
    .order("sort_order", { ascending: true });

  return (
    <main className="container-page py-12">
      <div className="mb-10">
        <p className="font-black uppercase tracking-[0.25em] text-paprika">
          Admin
        </p>
        <h1 className="section-title mt-3">Inventory</h1>
        <p className="mt-4 max-w-2xl text-dark/60">
          Manage product stock. If tracked stock is 0, product is hidden from
          the customer menu.
        </p>
      </div>

      <InventoryManager products={products || []} />
    </main>
  );
}