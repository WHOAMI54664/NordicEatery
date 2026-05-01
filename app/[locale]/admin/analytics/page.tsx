import { redirect } from "next/navigation";
import {
  Activity,
  Banknote,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  PieChart,
  TrendingUp,
  Truck
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AdminShell } from "@/components/admin/AdminShell";
import { createClient } from "@/lib/supabase/server";
import { canViewAnalytics } from "@/lib/auth/roles";

type AnalyticsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

type OrderRow = {
  id: string;
  total_price: number | null;
  status: string | null;
  delivery_type: "delivery" | "pickup" | null;
  payment_method: "cash" | "swish" | "card" | null;
  payment_status: string | null;
  created_at: string;
};

function formatCurrency(value: number, locale: string) {
  return new Intl.NumberFormat(locale === "en" ? "en-SE" : locale, {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function formatDate(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-SE" : locale, {
    month: "short",
    day: "numeric"
  }).format(new Date(date));
}

function getLast7Days(locale: string) {
  const days: Array<{
    label: string;
    key: string;
    date: Date;
  }> = [];

  for (let index = 6; index >= 0; index--) {
    const date = new Date();
    date.setDate(date.getDate() - index);
    date.setHours(0, 0, 0, 0);

    days.push({
      label: formatDate(date.toISOString(), locale),
      key: date.toISOString().slice(0, 10),
      date
    });
  }

  return days;
}

function isSameDay(dateString: string, key: string) {
  return new Date(dateString).toISOString().slice(0, 10) === key;
}

function getStatusKey(status: string | null) {
  if (!status) return "unknown";

  const normalized = status.toLowerCase();

  if (normalized === "new") return "new";
  if (normalized === "preparing") return "preparing";
  if (normalized === "ready") return "ready";
  if (normalized === "completed") return "completed";
  if (normalized === "cancelled") return "cancelled";

  return "unknown";
}

function getStatusClass(status: string | null) {
  switch (status) {
    case "new":
      return "border-[#F6A21A]/25 bg-[#F6A21A]/15 text-[#A96800]";
    case "preparing":
      return "border-[#FF9F40]/25 bg-[#FF9F40]/15 text-[#B45309]";
    case "ready":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700";
    case "completed":
      return "border-[#EADDCF] bg-[#FFF3E2] text-[#7B6A61]";
    case "cancelled":
      return "border-[#E51B23]/15 bg-[#E51B23]/8 text-[#C7192E]";
    default:
      return "border-[#EADDCF] bg-[#FFF3E2] text-[#7B6A61]";
  }
}

function AnalyticsStatCard({
                             title,
                             value,
                             description,
                             icon: Icon,
                             tone = "red"
                           }: {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
  tone?: "red" | "green" | "gold" | "dark";
}) {
  const iconClass =
      tone === "green"
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
          : tone === "gold"
              ? "border-[#F6A21A]/25 bg-[#F6A21A]/15 text-[#A96800]"
              : tone === "dark"
                  ? "border-[#EADDCF] bg-[#FFF3E2] text-[#7B6A61]"
                  : "border-[#E51B23]/15 bg-[#E51B23]/8 text-[#C7192E]";

  return (
      <div className="relative overflow-hidden rounded-[1.75rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl">
        <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[#E51B23]/8 blur-2xl" />

        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black text-[#8A7A70]">{title}</p>
            <h3 className="mt-3 text-3xl font-black tracking-[-0.055em] text-[#25120F]">
              {value}
            </h3>
          </div>

          <div
              className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${iconClass}`}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>

        <p className="relative mt-4 text-xs font-medium text-[#7B6A61]">
          {description}
        </p>
      </div>
  );
}

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const { locale } = await params;

  const t = await getTranslations("admin");

  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?next=/${locale}/admin/analytics`);
  }

  const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

  if (!canViewAnalytics(profile?.role)) {
    redirect(`/${locale}/unauthorized`);
  }

  const { data: orders, error } = await supabase
      .from("orders")
      .select(
          "id, total_price, status, delivery_type, payment_method, payment_status, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(250);

  const orderList = ((orders || []) as OrderRow[]) || [];

  const completedOrders = orderList.filter(
      (order) => order.status === "completed"
  );

  const activeOrders = orderList.filter((order) =>
      ["new", "preparing", "ready"].includes(String(order.status))
  );

  const cancelledOrders = orderList.filter(
      (order) => order.status === "cancelled"
  );

  const revenue = completedOrders.reduce(
      (sum, order) => sum + Number(order.total_price || 0),
      0
  );

  const activeRevenue = activeOrders.reduce(
      (sum, order) => sum + Number(order.total_price || 0),
      0
  );

  const averageOrderValue =
      completedOrders.length > 0 ? revenue / completedOrders.length : 0;

  const deliveryOrders = orderList.filter(
      (order) => order.delivery_type === "delivery"
  );

  const pickupOrders = orderList.filter(
      (order) => order.delivery_type === "pickup"
  );

  const cashOrders = orderList.filter(
      (order) => order.payment_method === "cash"
  );

  const cardOrders = orderList.filter(
      (order) => order.payment_method === "card"
  );

  const swishOrders = orderList.filter(
      (order) => order.payment_method === "swish"
  );

  const paidOrders = orderList.filter(
      (order) => order.payment_status === "paid"
  );

  const last7Days = getLast7Days(locale);

  const dailyStats = last7Days.map((day) => {
    const dayOrders = orderList.filter((order) =>
        isSameDay(order.created_at, day.key)
    );

    const dayCompletedOrders = dayOrders.filter(
        (order) => order.status === "completed"
    );

    const dayRevenue = dayCompletedOrders.reduce(
        (sum, order) => sum + Number(order.total_price || 0),
        0
    );

    return {
      ...day,
      orders: dayOrders.length,
      revenue: dayRevenue
    };
  });

  const maxDailyRevenue = Math.max(
      ...dailyStats.map((day) => day.revenue),
      1
  );

  const maxDailyOrders = Math.max(...dailyStats.map((day) => day.orders), 1);

  const recentOrders = orderList.slice(0, 8);

  return (
      <AdminShell>
        <div className="space-y-6">
          <section className="relative overflow-hidden rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-2xl shadow-[#4C2314]/10 backdrop-blur-2xl lg:p-6">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(229,27,35,0.09),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(255,159,64,0.16),transparent_34%)]" />

            <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#E51B23]/15 bg-[#E51B23]/8 px-3 py-1 text-xs font-black text-[#C7192E]">
                  <BarChart3 className="h-3.5 w-3.5" />
                  {t("analytics.eyebrow")}
                </div>

                <h1 className="mt-4 text-4xl font-black tracking-[-0.055em] text-[#25120F] md:text-5xl">
                  {t("analytics.title")}
                </h1>

                <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[#7B6A61]">
                  {t("analytics.subtitle")}
                </p>
              </div>

              <div className="flex h-12 items-center gap-2 rounded-2xl border border-[#EADDCF] bg-white/70 px-4 text-sm font-black text-[#7B6A61]">
                <CalendarClock className="h-4 w-4 text-[#C7192E]" />
                {t("analytics.lastOrders", { count: 250 })}
              </div>
            </div>
          </section>

          {error ? (
              <div className="rounded-[1.5rem] border border-[#E51B23]/15 bg-[#E51B23]/8 p-4 text-sm font-bold text-[#C7192E]">
                {error.message}
              </div>
          ) : null}

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AnalyticsStatCard
                title={t("analytics.revenue")}
                value={formatCurrency(revenue, locale)}
                description={t("analytics.completedOrdersOnly")}
                icon={TrendingUp}
                tone="red"
            />

            <AnalyticsStatCard
                title={t("analytics.totalOrders")}
                value={String(orderList.length)}
                description={t("analytics.ordersLoaded")}
                icon={ClipboardList}
                tone="dark"
            />

            <AnalyticsStatCard
                title={t("analytics.completed")}
                value={String(completedOrders.length)}
                description={t("analytics.completedDescription")}
                icon={CheckCircle2}
                tone="green"
            />

            <AnalyticsStatCard
                title={t("analytics.activeNow")}
                value={String(activeOrders.length)}
                description={t("analytics.activeNowDescription")}
                icon={Activity}
                tone="gold"
            />
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AnalyticsStatCard
                title={t("analytics.averageOrder")}
                value={formatCurrency(averageOrderValue, locale)}
                description={t("analytics.averageOrderDescription")}
                icon={Banknote}
                tone="red"
            />

            <AnalyticsStatCard
                title={t("analytics.activeRevenue")}
                value={formatCurrency(activeRevenue, locale)}
                description={t("analytics.activeRevenueDescription")}
                icon={CreditCard}
                tone="gold"
            />

            <AnalyticsStatCard
                title={t("analytics.delivery")}
                value={String(deliveryOrders.length)}
                description={t("analytics.deliveryDescription")}
                icon={Truck}
                tone="red"
            />

            <AnalyticsStatCard
                title={t("analytics.cancelled")}
                value={String(cancelledOrders.length)}
                description={t("analytics.cancelledDescription")}
                icon={PieChart}
                tone="dark"
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
            <div className="rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl lg:p-6">
              <div className="mb-6 flex flex-col gap-3 border-b border-[#EADDCF] pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-black tracking-[-0.03em] text-[#25120F]">
                    {t("analytics.revenueTrend")}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-[#7B6A61]">
                    {t("analytics.revenueTrendDescription")}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#EADDCF] bg-white/70 px-4 py-2 text-sm font-black text-[#7B6A61]">
                  {t("analytics.sevenDays")}
                </div>
              </div>

              <div className="flex h-80 items-end gap-3">
                {dailyStats.map((day) => {
                  const height = Math.max(
                      8,
                      Math.round((day.revenue / maxDailyRevenue) * 100)
                  );

                  return (
                      <div
                          key={day.key}
                          className="flex h-full flex-1 flex-col justify-end gap-3"
                      >
                        <div className="flex flex-1 items-end rounded-2xl border border-[#EADDCF] bg-white/60 p-2">
                          <div
                              className="w-full rounded-xl bg-gradient-to-t from-[#E51B23] to-[#FF9F40] shadow-lg shadow-[#E51B23]/15"
                              style={{ height: `${height}%` }}
                          />
                        </div>

                        <div className="text-center">
                          <p className="text-xs font-black text-[#25120F]">
                            {formatCurrency(day.revenue, locale)}
                          </p>
                          <p className="mt-1 text-[11px] font-bold text-[#A39388]">
                            {day.label}
                          </p>
                        </div>
                      </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl lg:p-6">
                <div className="mb-5 border-b border-[#EADDCF] pb-5">
                  <h2 className="text-xl font-black tracking-[-0.03em] text-[#25120F]">
                    {t("analytics.orderVolume")}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-[#7B6A61]">
                    {t("analytics.orderVolumeDescription")}
                  </p>
                </div>

                <div className="space-y-3">
                  {dailyStats.map((day) => {
                    const width = Math.max(
                        4,
                        Math.round((day.orders / maxDailyOrders) * 100)
                    );

                    return (
                        <div key={day.key}>
                          <div className="mb-1 flex items-center justify-between gap-3">
                        <span className="text-xs font-black text-[#25120F]">
                          {day.label}
                        </span>
                            <span className="text-xs font-black text-[#C7192E]">
                          {day.orders}
                        </span>
                          </div>

                          <div className="h-3 overflow-hidden rounded-full bg-[#FFF3E2]">
                            <div
                                className="h-full rounded-full bg-[#E51B23]"
                                style={{ width: `${width}%` }}
                            />
                          </div>
                        </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[2rem] border border-[#EADDCF] bg-gradient-to-br from-[#FFFCF6]/95 via-[#FFF3E2]/90 to-[#FFE4D6]/75 p-5 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl lg:p-6">
                <div className="mb-5 border-b border-[#EADDCF] pb-5">
                  <h2 className="text-xl font-black tracking-[-0.03em] text-[#25120F]">
                    {t("analytics.paymentMix")}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-[#7B6A61]">
                    {t("analytics.paymentMixDescription")}
                  </p>
                </div>

                <div className="grid gap-3">
                  <div className="flex items-center justify-between rounded-2xl border border-[#EADDCF] bg-white/70 p-4">
                  <span className="text-sm font-black text-[#25120F]">
                    {t("analytics.cash")}
                  </span>
                    <span className="text-sm font-black text-[#C7192E]">
                    {cashOrders.length}
                  </span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-[#EADDCF] bg-white/70 p-4">
                  <span className="text-sm font-black text-[#25120F]">
                    {t("analytics.card")}
                  </span>
                    <span className="text-sm font-black text-[#C7192E]">
                    {cardOrders.length}
                  </span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-[#EADDCF] bg-white/70 p-4">
                  <span className="text-sm font-black text-[#25120F]">
                    {t("analytics.swish")}
                  </span>
                    <span className="text-sm font-black text-[#C7192E]">
                    {swishOrders.length}
                  </span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                  <span className="text-sm font-black text-emerald-800">
                    {t("analytics.paidOrders")}
                  </span>
                    <span className="text-sm font-black text-emerald-700">
                    {paidOrders.length}
                  </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/88 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl">
            <div className="flex flex-col gap-3 border-b border-[#EADDCF] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black tracking-[-0.03em] text-[#25120F]">
                  {t("analytics.recentOrders")}
                </h2>
                <p className="mt-1 text-sm font-medium text-[#7B6A61]">
                  {t("analytics.recentOrdersDescription")}
                </p>
              </div>

              <div className="rounded-2xl border border-[#EADDCF] bg-white/70 px-4 py-2 text-sm font-black text-[#7B6A61]">
                {t("analytics.shown", { count: recentOrders.length })}
              </div>
            </div>

            {recentOrders.length === 0 ? (
                <div className="p-5">
                  <div className="rounded-[1.5rem] border border-dashed border-[#EADDCF] bg-white/60 p-8 text-center">
                    <ClipboardList className="mx-auto h-10 w-10 text-[#C7192E]" />
                    <p className="mt-4 text-sm font-black text-[#25120F]">
                      {t("analytics.noOrdersFound")}
                    </p>
                    <p className="mt-2 text-sm font-medium text-[#7B6A61]">
                      {t("analytics.noOrdersDescription")}
                    </p>
                  </div>
                </div>
            ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] border-separate border-spacing-y-2 px-5 py-3 text-left">
                    <thead>
                    <tr className="text-xs uppercase tracking-[0.16em] text-[#A39388]">
                      <th className="px-4 py-2 font-black">
                        {t("table.order")}
                      </th>
                      <th className="px-4 py-2 font-black">
                        {t("table.status")}
                      </th>
                      <th className="px-4 py-2 font-black">
                        {t("analytics.payment")}
                      </th>
                      <th className="px-4 py-2 font-black">
                        {t("analytics.type")}
                      </th>
                      <th className="px-4 py-2 font-black">
                        {t("table.total")}
                      </th>
                      <th className="px-4 py-2 font-black">
                        {t("analytics.created")}
                      </th>
                    </tr>
                    </thead>

                    <tbody>
                    {recentOrders.map((order) => {
                      const statusKey = getStatusKey(order.status);

                      return (
                          <tr key={order.id} className="group">
                            <td className="rounded-l-2xl border-y border-l border-[#EADDCF] bg-white/70 px-4 py-4 group-hover:bg-[#FFF3E2]">
                              <p className="max-w-[160px] truncate text-sm font-black text-[#25120F]">
                                {order.id}
                              </p>
                            </td>

                            <td className="border-y border-[#EADDCF] bg-white/70 px-4 py-4 group-hover:bg-[#FFF3E2]">
                          <span
                              className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusClass(
                                  order.status
                              )}`}
                          >
                            {statusKey === "unknown"
                                ? t("analytics.unknown")
                                : t(`statuses.${statusKey}`)}
                          </span>
                            </td>

                            <td className="border-y border-[#EADDCF] bg-white/70 px-4 py-4 text-sm font-black capitalize text-[#25120F] group-hover:bg-[#FFF3E2]">
                              {order.payment_method || "—"}
                            </td>

                            <td className="border-y border-[#EADDCF] bg-white/70 px-4 py-4 text-sm font-black capitalize text-[#7B6A61] group-hover:bg-[#FFF3E2]">
                              {order.delivery_type || "—"}
                            </td>

                            <td className="border-y border-[#EADDCF] bg-white/70 px-4 py-4 text-sm font-black text-[#C7192E] group-hover:bg-[#FFF3E2]">
                              {formatCurrency(Number(order.total_price || 0), locale)}
                            </td>

                            <td className="rounded-r-2xl border-y border-r border-[#EADDCF] bg-white/70 px-4 py-4 text-sm font-bold text-[#25120F] group-hover:bg-[#FFF3E2]">
                              {formatDate(order.created_at, locale)}
                            </td>
                          </tr>
                      );
                    })}
                    </tbody>
                  </table>
                </div>
            )}
          </section>
        </div>
      </AdminShell>
  );
}