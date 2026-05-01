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
import { getTranslations } from "next-intl/server";
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

    const t = await getTranslations("admin");

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
                                {t("documentation.eyebrow")}
                            </div>

                            <h1 className="mt-4 text-4xl font-black tracking-[-0.055em] text-[#25120F] md:text-5xl">
                                {t("documentation.title")}
                            </h1>

                            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[#7B6A61]">
                                {t("documentation.subtitle")}
                            </p>
                        </div>

                        <div className="flex h-12 items-center gap-2 rounded-2xl border border-[#EADDCF] bg-white/70 px-4 text-sm font-black text-[#7B6A61]">
                            <ShieldCheck className="h-4 w-4 text-[#C7192E]" />
                            {t("documentation.accessBadge")}
                        </div>
                    </div>
                </section>

                <section className="grid gap-6 xl:grid-cols-2">
                    <DocumentationSection
                        icon={LayoutDashboard}
                        title={t("documentation.dashboard.title")}
                        description={t("documentation.dashboard.description")}
                        items={[
                            t("documentation.dashboard.item1"),
                            t("documentation.dashboard.item2"),
                            t("documentation.dashboard.item3"),
                            t("documentation.dashboard.item4")
                        ]}
                    />

                    <DocumentationSection
                        icon={ClipboardList}
                        title={t("documentation.orders.title")}
                        description={t("documentation.orders.description")}
                        items={[
                            t("documentation.orders.item1"),
                            t("documentation.orders.item2"),
                            t("documentation.orders.item3"),
                            t("documentation.orders.item4")
                        ]}
                    />

                    <DocumentationSection
                        icon={ChefHat}
                        title={t("documentation.kitchen.title")}
                        description={t("documentation.kitchen.description")}
                        items={[
                            t("documentation.kitchen.item1"),
                            t("documentation.kitchen.item2"),
                            t("documentation.kitchen.item3"),
                            t("documentation.kitchen.item4")
                        ]}
                    />

                    <DocumentationSection
                        icon={Package}
                        title={t("documentation.products.title")}
                        description={t("documentation.products.description")}
                        items={[
                            t("documentation.products.item1"),
                            t("documentation.products.item2"),
                            t("documentation.products.item3"),
                            t("documentation.products.item4")
                        ]}
                    />

                    <DocumentationSection
                        icon={UsersRound}
                        title={t("documentation.staff.title")}
                        description={t("documentation.staff.description")}
                        items={[
                            t("documentation.staff.item1"),
                            t("documentation.staff.item2"),
                            t("documentation.staff.item3"),
                            t("documentation.staff.item4")
                        ]}
                    />

                    <DocumentationSection
                        icon={Settings}
                        title={t("documentation.settingsSection.title")}
                        description={t("documentation.settingsSection.description")}
                        items={[
                            t("documentation.settingsSection.item1"),
                            t("documentation.settingsSection.item2"),
                            t("documentation.settingsSection.item3"),
                            t("documentation.settingsSection.item4")
                        ]}
                    />

                    <DocumentationSection
                        icon={CreditCard}
                        title={t("documentation.payments.title")}
                        description={t("documentation.payments.description")}
                        items={[
                            t("documentation.payments.item1"),
                            t("documentation.payments.item2"),
                            t("documentation.payments.item3"),
                            t("documentation.payments.item4")
                        ]}
                    />

                    <DocumentationSection
                        icon={Truck}
                        title={t("documentation.deployment.title")}
                        description={t("documentation.deployment.description")}
                        items={[
                            t("documentation.deployment.item1"),
                            t("documentation.deployment.item2"),
                            t("documentation.deployment.item3"),
                            t("documentation.deployment.item4")
                        ]}
                    />
                </section>
            </div>
        </AdminShell>
    );
}