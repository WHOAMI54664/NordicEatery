import { redirect } from "next/navigation";
import {
    BookOpen,
    ChefHat,
    ClipboardList,
    CreditCard,
    LayoutDashboard,
    Package,
    Settings,
    ShieldCheck,
    Truck,
    UsersRound
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { createClient } from "@/lib/supabase/server";
import { canManageSettings } from "@/lib/auth/roles";

type DocumentationPageProps = {
    params: Promise<{
        locale: string;
    }>;
};

function DocumentationSection({
                                  icon: Icon,
                                  title,
                                  description,
                                  items
                              }: {
    icon: React.ElementType;
    title: string;
    description: string;
    items: string[];
}) {
    return (
        <section className="rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl lg:p-6">
            <div className="mb-5 flex items-start gap-4 border-b border-[#EADDCF] pb-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#E51B23]/15 bg-[#E51B23]/8">
                    <Icon className="h-5 w-5 text-[#C7192E]" />
                </div>

                <div>
                    <h2 className="text-xl font-black tracking-[-0.03em] text-[#25120F]">
                        {title}
                    </h2>
                    <p className="mt-1 text-sm font-medium leading-6 text-[#7B6A61]">
                        {description}
                    </p>
                </div>
            </div>

            <ul className="space-y-3">
                {items.map((item) => (
                    <li
                        key={item}
                        className="rounded-2xl border border-[#EADDCF] bg-white/70 px-4 py-3 text-sm font-bold leading-6 text-[#25120F]"
                    >
                        {item}
                    </li>
                ))}
            </ul>
        </section>
    );
}

export default async function DocumentationPage({
                                                    params
                                                }: DocumentationPageProps) {
    const { locale } = await params;

    const supabase = await createClient();

    const {
        data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/${locale}/login?next=/${locale}/admin/documentation`);
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!canManageSettings(profile?.role)) {
        redirect(`/${locale}/unauthorized`);
    }

    return (
        <AdminShell>
            <div className="space-y-6">
                <section className="relative overflow-hidden rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-2xl shadow-[#4C2314]/10 backdrop-blur-2xl lg:p-6">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(229,27,35,0.09),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(255,159,64,0.16),transparent_34%)]" />

                    <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-[#E51B23]/15 bg-[#E51B23]/8 px-3 py-1 text-xs font-black text-[#C7192E]">
                                <BookOpen className="h-3.5 w-3.5" />
                                CRM documentation
                            </div>

                            <h1 className="mt-4 text-4xl font-black tracking-[-0.055em] text-[#25120F] md:text-5xl">
                                Documentation
                            </h1>

                            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[#7B6A61]">
                                Internal guide for managing orders, products, kitchen display,
                                staff roles, settings and deployment.
                            </p>
                        </div>

                        <div className="flex h-12 items-center gap-2 rounded-2xl border border-[#EADDCF] bg-white/70 px-4 text-sm font-black text-[#7B6A61]">
                            <ShieldCheck className="h-4 w-4 text-[#C7192E]" />
                            Owner / Admin guide
                        </div>
                    </div>
                </section>

                <section className="grid gap-6 xl:grid-cols-2">
                    <DocumentationSection
                        icon={LayoutDashboard}
                        title="Dashboard"
                        description="Main overview of restaurant activity."
                        items={[
                            "Shows today revenue, orders, active deliveries and low stock items.",
                            "Recent orders are loaded from Supabase orders table.",
                            "Menu snapshot is loaded from Supabase products table.",
                            "Greeting is shown only on Dashboard and can later be animated."
                        ]}
                    />

                    <DocumentationSection
                        icon={ClipboardList}
                        title="Orders"
                        description="Order management for owner and admin."
                        items={[
                            "Orders page shows all latest orders from Supabase.",
                            "Statuses: new, preparing, ready, completed, cancelled.",
                            "Admin can move order through the kitchen flow.",
                            "Cancelled orders are not removed from database, only marked as cancelled."
                        ]}
                    />

                    <DocumentationSection
                        icon={ChefHat}
                        title="Kitchen display"
                        description="Dedicated screen for cooks."
                        items={[
                            "Kitchen display should be opened at /kitchen-display.",
                            "Cook role can access kitchen-display without seeing the full CRM.",
                            "Kitchen board auto-refreshes orders every 3 seconds.",
                            "Card payments are shown only after payment_status is paid."
                        ]}
                    />

                    <DocumentationSection
                        icon={Package}
                        title="Products & Menu"
                        description="Product catalogue and menu category structure."
                        items={[
                            "Products are managed at /admin/products.",
                            "Create and edit products through CRM product form.",
                            "Use matching categories: maczanka, knysza, fries, drinks.",
                            "Public menu only shows available products with stock or untracked stock."
                        ]}
                    />

                    <DocumentationSection
                        icon={UsersRound}
                        title="Staff roles"
                        description="Role-based access for CRM and kitchen."
                        items={[
                            "Roles: owner, admin, cook.",
                            "Owner can manage staff roles.",
                            "Admin can manage products, orders, settings and analytics.",
                            "Cook should only access kitchen-display."
                        ]}
                    />

                    <DocumentationSection
                        icon={Settings}
                        title="Settings"
                        description="Business settings stored in Supabase."
                        items={[
                            "Settings are stored in business_settings table.",
                            "Owner/admin can update business information, delivery and payment options.",
                            "Swish is currently marked as planned until integration is ready.",
                            "These settings can later be connected to checkout, footer and contact pages."
                        ]}
                    />

                    <DocumentationSection
                        icon={CreditCard}
                        title="Payments"
                        description="Payment logic for checkout and CRM."
                        items={[
                            "Cash orders can appear immediately as unpaid.",
                            "Card orders should become visible to kitchen only after paid status.",
                            "Swish integration is planned as the next payment feature.",
                            "Stripe can be used for card, Apple Pay and Google Pay."
                        ]}
                    />

                    <DocumentationSection
                        icon={Truck}
                        title="Deployment checklist"
                        description="Before deploying to Vercel or production."
                        items={[
                            "Check that Supabase environment variables are set in Vercel.",
                            "Check Stripe keys and NEXT_PUBLIC_SITE_URL.",
                            "Run npm run build locally before deployment.",
                            "Verify admin routes, orders, products, kitchen-display and settings."
                        ]}
                    />
                </section>
            </div>
        </AdminShell>
    );
}