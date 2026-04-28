import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Package,
  BarChart3,
  ClipboardList,
  Users,
  Warehouse,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { canManageStaff } from "@/lib/auth/roles";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/login?next=/${locale}/admin`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!canManageStaff(profile?.role)) redirect(`/${locale}/unauthorized`);

  const cards = [
    {
      title: "Products",
      description: "Add dishes, edit prices and photos.",
      href: `/${locale}/admin/products`,
      icon: Package,
    },
    {
      title: "Orders",
      description: "View all customer orders.",
      href: `/${locale}/kitchen`,
      icon: ClipboardList,
    },
    {
      title: "Analytics",
      description: "Sales, orders and popular products.",
      href: `/${locale}/admin/analytics`,
      icon: BarChart3,
    },
    {
      title: "Staff",
      description: "Manage owner, admin and cook roles.",
      href: `/${locale}/admin/staff`,
      icon: Users,
    },
    {
      title: "Inventory",
      description: "Track stock, ingredients and low quantity items.",
      href: `/${locale}/admin/inventory`,
      icon: Warehouse,
    },
  ];

  return (
    <main className="container-page py-12">
      <div className="mb-10">
        <p className="font-black uppercase tracking-[0.25em] text-paprika">
          Admin
        </p>
        <h1 className="section-title mt-3">Eatery control panel</h1>
        <p className="mt-4 max-w-2xl text-lg text-dark/60">
          Manage products, prices, orders and analytics.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <Link
              key={card.href}
              href={card.href}
              className="glass-card p-6 transition hover:-translate-y-1 hover:bg-white"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-paprika/10 text-paprika">
                <Icon size={22} />
              </div>

              <h2 className="mt-6 text-xl font-black text-dark">
                {card.title}
              </h2>

              <p className="mt-2 text-sm leading-6 text-dark/55">
                {card.description}
              </p>
            </Link>
          );
        })}
      </div>
    </main>
  );
}