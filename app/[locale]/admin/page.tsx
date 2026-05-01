import {
  Activity,
  ChefHat,
  ClipboardList,
  CreditCard,
  Package,
  Truck,
  Users
} from "lucide-react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { createClient } from "@/lib/supabase/server";
import { AdminTopbar } from "@/components/admin/AdminTopbar";

type AdminPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

type ProductRow = {
  id: string;
  name: string | null;
  price: number | null;
  is_available: boolean | null;
  track_stock: boolean | null;
  stock_quantity: number | null;
};

type ProfileRow = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  role?: string | null;
};

type OrderRow = {
  id: string;
  order_number?: string | null;
  customer_name?: string | null;
  customerName?: string | null;
  customer_phone?: string | null;
  total_price?: number | null;
  totalPrice?: number | null;
  status?: string | null;
  delivery_type?: string | null;
  deliveryType?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0
  }).format(value);
}

function formatOrderNumber(order: OrderRow) {
  if (order.order_number) return order.order_number;

  if (!order.id) return "MF-ORDER";

  const cleanId = order.id.replace(/-/g, "").toUpperCase();
  const shortId = cleanId.slice(-7);

  return `MF-${shortId}`;
}

function getTodayStartIso() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

function getOrderCreatedAt(order: OrderRow) {
  return order.created_at || order.createdAt || null;
}

function getOrderTotal(order: OrderRow) {
  return Number(order.total_price ?? order.totalPrice ?? 0);
}

function getOrderCustomer(order: OrderRow) {
  return order.customer_name || order.customerName || "Guest";
}

function getOrderStatus(status?: string | null) {
  if (!status) return "New";

  const normalized = status.toLowerCase();

  if (normalized === "new") return "New";
  if (normalized === "preparing") return "Preparing";
  if (normalized === "ready") return "Ready";
  if (normalized === "completed") return "Completed";
  if (normalized === "cancelled") return "Cancelled";

  return status;
}

function getTimeAgo(dateString?: string | null) {
  if (!dateString) return "Recently";

  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} d ago`;
}

function getStatusClass(status: string) {
  switch (status) {
    case "New":
      return "border-[#F6A21A]/25 bg-[#F6A21A]/15 text-[#A96800]";
    case "Preparing":
      return "border-[#FF9F40]/25 bg-[#FF9F40]/15 text-[#B45309]";
    case "Ready":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700";
    case "Completed":
      return "border-[#EADDCF] bg-[#FFF3E2] text-[#7B6A61]";
    case "Cancelled":
      return "border-[#E51B23]/15 bg-[#E51B23]/8 text-[#C7192E]";
    default:
      return "border-[#EADDCF] bg-[#FFF3E2] text-[#7B6A61]";
  }
}

async function getProducts(
    supabase: Awaited<ReturnType<typeof createClient>>
) {
  const { data, error } = await supabase
      .from("products")
      .select("id, name, price, is_available, track_stock, stock_quantity")
      .order("sort_order", { ascending: true });

  if (error) {
    console.warn("Products query failed:", error.message);
    return [] as ProductRow[];
  }

  return (data || []) as ProductRow[];
}

async function getProfiles(
    supabase: Awaited<ReturnType<typeof createClient>>
) {
  const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role");

  if (error) {
    console.warn("Profiles query failed:", error.message);
    return [] as ProfileRow[];
  }

  return (data || []) as ProfileRow[];
}

async function getOrders(
    supabase: Awaited<ReturnType<typeof createClient>>
) {
  const todayStart = getTodayStartIso();

  const { data, error } = await supabase
      .from("orders")
      .select(
          "id, order_number, customer_name, customer_phone, total_price, status, delivery_type, created_at"
      )
      .gte("created_at", todayStart)
      .order("created_at", { ascending: false })
      .limit(20);

  if (error) {
    console.warn("Orders query failed:", error.message);
    return [] as OrderRow[];
  }

  return (data || []) as OrderRow[];
}

export default async function AdminPage({ params }: AdminPageProps) {
  const { locale } = await params;

  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?next=/${locale}/admin`);
  }

  const { data: currentProfile } = await supabase
      .from("profiles")
      .select("full_name, email, role")
      .eq("id", user.id)
      .single();

  const profileName =
      currentProfile?.full_name?.trim() ||
      currentProfile?.email?.split("@")[0] ||
      user.email?.split("@")[0] ||
      "Admin";

  const [products, profiles, orders] = await Promise.all([
    getProducts(supabase),
    getProfiles(supabase),
    getOrders(supabase)
  ]);

  const todayRevenue = orders.reduce((sum, order) => {
    const status = String(order.status || "").toLowerCase();

    if (status === "cancelled") return sum;

    return sum + getOrderTotal(order);
  }, 0);

  const activeDeliveries = orders.filter((order) => {
    const status = String(order.status || "").toLowerCase();
    const deliveryType = String(
        order.delivery_type || order.deliveryType || ""
    ).toLowerCase();

    return (
        deliveryType === "delivery" &&
        ["new", "preparing", "ready"].includes(status)
    );
  }).length;

  const preparingOrders = orders.filter(
      (order) => String(order.status || "").toLowerCase() === "preparing"
  ).length;

  const lowStockItems = products.filter((product) => {
    return (
        Boolean(product.track_stock) &&
        Number(product.stock_quantity || 0) <= 5
    );
  }).length;

  const availableProducts = products.filter(
      (product) => product.is_available !== false
  ).length;

  const staffCount = profiles.length;

  const recentOrders = orders.slice(0, 6).map((order) => {
    const status = getOrderStatus(order.status);
    const createdAt = getOrderCreatedAt(order);

    return {
      id: order.id,
      displayId: formatOrderNumber(order),
      customer: getOrderCustomer(order),
      items: "Order items",
      total: formatCurrency(getOrderTotal(order)),
      status,
      time: getTimeAgo(createdAt)
    };
  });

  const topDishes = products.slice(0, 3).map((product) => ({
    name: product.name || "Unnamed dish",
    sold: product.is_available === false ? "Not available" : "Available now",
    revenue: product.price ? formatCurrency(product.price) : "No price"
  }));

  return (
      <AdminShell>
        <AdminTopbar displayName={profileName} />

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard
              title="Today revenue"
              value={formatCurrency(todayRevenue)}
              description="Calculated from today's orders"
              trend={orders.length > 0 ? "Live" : "No orders"}
              icon={CreditCard}
          />

          <AdminStatCard
              title="Orders today"
              value={String(orders.length)}
              description="Online and pickup orders"
              trend="Today"
              icon={ClipboardList}
          />

          <AdminStatCard
              title="Active deliveries"
              value={String(activeDeliveries)}
              description="Currently on the road"
              trend="Live"
              icon={Truck}
          />

          <AdminStatCard
              title="Low stock items"
              value={String(lowStockItems)}
              description={`${availableProducts} products available`}
              trend="Check"
              icon={Package}
          />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_0.85fr]">
          <div className="rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl">
            <div className="flex flex-col gap-3 border-b border-[#EADDCF] pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black tracking-[-0.03em] text-[#25120F]">
                  Recent orders
                </h2>
                <p className="mt-1 text-sm font-medium text-[#7B6A61]">
                  Live overview of your restaurant orders.
                </p>
              </div>

              <Link
                  href={`/${locale}/admin/orders`}
                  className="rounded-2xl border border-[#E51B23]/15 bg-[#E51B23]/8 px-4 py-2 text-sm font-black text-[#C7192E] transition hover:bg-[#E51B23]/12"
              >
                View all orders
              </Link>
            </div>

            <div className="mt-5 overflow-x-auto">
              {recentOrders.length > 0 ? (
                  <table className="w-full min-w-[720px] border-separate border-spacing-y-2 text-left">
                    <thead>
                    <tr className="text-xs uppercase tracking-[0.16em] text-[#A39388]">
                      <th className="px-4 py-2 font-black">Order</th>
                      <th className="px-4 py-2 font-black">Customer</th>
                      <th className="px-4 py-2 font-black">Items</th>
                      <th className="px-4 py-2 font-black">Total</th>
                      <th className="px-4 py-2 font-black">Status</th>
                      <th className="px-4 py-2 font-black">Time</th>
                    </tr>
                    </thead>

                    <tbody>
                    {recentOrders.map((order) => (
                        <tr key={order.id} className="group">
                          <td className="rounded-l-2xl border-y border-l border-[#EADDCF] bg-white/70 px-4 py-4 text-sm font-black text-[#25120F] group-hover:bg-[#FFF3E2]">
                            {order.displayId}
                          </td>

                          <td className="border-y border-[#EADDCF] bg-white/70 px-4 py-4 text-sm font-semibold text-[#25120F] group-hover:bg-[#FFF3E2]">
                            {order.customer}
                          </td>

                          <td className="border-y border-[#EADDCF] bg-white/70 px-4 py-4 text-sm font-medium text-[#7B6A61] group-hover:bg-[#FFF3E2]">
                            {order.items}
                          </td>

                          <td className="border-y border-[#EADDCF] bg-white/70 px-4 py-4 text-sm font-black text-[#25120F] group-hover:bg-[#FFF3E2]">
                            {order.total}
                          </td>

                          <td className="border-y border-[#EADDCF] bg-white/70 px-4 py-4 group-hover:bg-[#FFF3E2]">
                        <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${getStatusClass(
                                order.status
                            )}`}
                        >
                          {order.status}
                        </span>
                          </td>

                          <td className="rounded-r-2xl border-y border-r border-[#EADDCF] bg-white/70 px-4 py-4 text-sm font-medium text-[#7B6A61] group-hover:bg-[#FFF3E2]">
                            {order.time}
                          </td>
                        </tr>
                    ))}
                    </tbody>
                  </table>
              ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-[#EADDCF] bg-white/60 p-8 text-center">
                    <p className="text-sm font-black text-[#25120F]">
                      No orders found for today
                    </p>
                    <p className="mt-2 text-sm font-medium text-[#7B6A61]">
                      When Supabase orders are saved, they will appear here.
                    </p>
                  </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black tracking-[-0.03em] text-[#25120F]">
                    Kitchen activity
                  </h2>
                  <p className="mt-1 text-sm font-medium text-[#7B6A61]">
                    Current operational status.
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E51B23]/15 bg-[#E51B23]/8">
                  <Activity className="h-5 w-5 text-[#C7192E]" />
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between rounded-2xl border border-[#EADDCF] bg-white/70 p-4">
                  <div className="flex items-center gap-3">
                    <ChefHat className="h-4 w-4 text-[#C7192E]" />
                    <span className="text-sm font-bold text-[#25120F]">
                    Preparing
                  </span>
                  </div>
                  <span className="text-sm font-black text-[#C7192E]">
                  {preparingOrders}
                </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-[#EADDCF] bg-white/70 p-4">
                  <div className="flex items-center gap-3">
                    <Truck className="h-4 w-4 text-emerald-700" />
                    <span className="text-sm font-bold text-[#25120F]">
                    On delivery
                  </span>
                  </div>
                  <span className="text-sm font-black text-emerald-700">
                  {activeDeliveries}
                </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-[#EADDCF] bg-white/70 p-4">
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-[#A96800]" />
                    <span className="text-sm font-bold text-[#25120F]">
                    Staff members
                  </span>
                  </div>
                  <span className="text-sm font-black text-[#A96800]">
                  {staffCount}
                </span>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#EADDCF] bg-gradient-to-br from-[#FFFCF6]/95 via-[#FFF3E2]/90 to-[#FFE4D6]/75 p-5 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl">
              <h2 className="text-xl font-black tracking-[-0.03em] text-[#25120F]">
                Menu snapshot
              </h2>

              <p className="mt-1 text-sm font-medium text-[#7B6A61]">
                Current products from Supabase.
              </p>

              <div className="mt-5 space-y-3">
                {topDishes.length > 0 ? (
                    topDishes.map((dish, index) => (
                        <div
                            key={`${dish.name}-${index}`}
                            className="flex items-center justify-between rounded-2xl border border-[#EADDCF] bg-white/70 p-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#E51B23]/8 text-sm font-black text-[#C7192E]">
                              {index + 1}
                            </div>

                            <div>
                              <p className="text-sm font-black text-[#25120F]">
                                {dish.name}
                              </p>
                              <p className="text-xs font-medium text-[#7B6A61]">
                                {dish.sold}
                              </p>
                            </div>
                          </div>

                          <p className="text-sm font-black text-[#25120F]">
                            {dish.revenue}
                          </p>
                        </div>
                    ))
                ) : (
                    <div className="rounded-2xl border border-dashed border-[#EADDCF] bg-white/60 p-5">
                      <p className="text-sm font-black text-[#25120F]">
                        No products found
                      </p>
                      <p className="mt-1 text-xs font-medium text-[#7B6A61]">
                        Add products in Supabase or admin products page.
                      </p>
                    </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </AdminShell>
  );
}