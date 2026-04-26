import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canViewAnalytics } from "@/lib/auth/roles";

export default async function AnalyticsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/admin/analytics");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!canViewAnalytics(profile?.role)) redirect("/unauthorized");

  const { data: orders } = await supabase
    .from("orders")
    .select("id, total_price, status, created_at");

  const totalOrders = orders?.length || 0;
  const completedOrders =
    orders?.filter((order) => order.status === "completed").length || 0;

  const revenue =
    orders
      ?.filter((order) => order.status === "completed")
      .reduce((sum, order) => sum + Number(order.total_price || 0), 0) || 0;

  const activeOrders =
    orders?.filter((order) =>
      ["new", "preparing", "ready"].includes(order.status)
    ).length || 0;

  return (
    <main className="container-page py-12">
      <div className="mb-10">
        <p className="font-black uppercase tracking-[0.25em] text-paprika">
          Admin
        </p>
        <h1 className="section-title mt-3">Analytics</h1>
        <p className="mt-4 text-dark/60">
          Sales, orders and kitchen activity.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-4">
        <div className="glass-card p-6">
          <p className="text-sm font-black text-dark/40">Revenue</p>
          <p className="mt-3 text-3xl font-black text-paprika">
            {revenue} kr
          </p>
        </div>

        <div className="glass-card p-6">
          <p className="text-sm font-black text-dark/40">Total orders</p>
          <p className="mt-3 text-3xl font-black text-dark">
            {totalOrders}
          </p>
        </div>

        <div className="glass-card p-6">
          <p className="text-sm font-black text-dark/40">Completed</p>
          <p className="mt-3 text-3xl font-black text-dark">
            {completedOrders}
          </p>
        </div>

        <div className="glass-card p-6">
          <p className="text-sm font-black text-dark/40">Active now</p>
          <p className="mt-3 text-3xl font-black text-dark">
            {activeOrders}
          </p>
        </div>
      </div>
    </main>
  );
}