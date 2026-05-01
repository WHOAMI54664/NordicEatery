import { redirect } from "next/navigation";
import { Settings, ShieldCheck } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { createClient } from "@/lib/supabase/server";
import { canManageSettings } from "@/lib/auth/roles";
import {
    BusinessSettingsForm,
    type BusinessSettings
} from "@/components/admin/BusinessSettingsForm";

type SettingsPageProps = {
    params: Promise<{
        locale: string;
    }>;
};

const fallbackSettings: BusinessSettings = {
    id: "",

    business_name: "Mikes Food",
    brand_name: "NordicEatery",

    support_email: "support@nordiceatery.se",
    booking_email: "booking@nordiceatery.se",
    phone: "",

    location: "Boden, Sweden",
    address: "",

    delivery_enabled: true,
    pickup_enabled: true,
    estimated_delivery_time: "30–40 min",
    delivery_area: "Boden",

    cash_enabled: true,
    card_enabled: true,
    swish_enabled: false,

    monday_friday_hours: "",
    saturday_hours: "",
    sunday_hours: "",
    holiday_mode: false,

    new_order_alerts: true,
    kitchen_updates: true,
    low_stock_alerts: true,
    email_notifications: false
};

export default async function AdminSettingsPage({
                                                    params
                                                }: SettingsPageProps) {
    const { locale } = await params;

    const supabase = await createClient();

    const {
        data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/${locale}/login?next=/${locale}/admin/settings`);
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!canManageSettings(profile?.role)) {
        redirect(`/${locale}/unauthorized`);
    }

    const { data: settings } = await supabase
        .from("business_settings")
        .select("*")
        .limit(1)
        .single();

    const businessSettings = (settings || fallbackSettings) as BusinessSettings;

    return (
        <AdminShell>
            <div className="space-y-6">
                <section className="relative overflow-hidden rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-2xl shadow-[#4C2314]/10 backdrop-blur-2xl lg:p-6">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(229,27,35,0.09),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(255,159,64,0.16),transparent_34%)]" />

                    <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-[#E51B23]/15 bg-[#E51B23]/8 px-3 py-1 text-xs font-black text-[#C7192E]">
                                <Settings className="h-3.5 w-3.5" />
                                Business settings
                            </div>

                            <h1 className="mt-4 text-4xl font-black tracking-[-0.055em] text-[#25120F] md:text-5xl">
                                Settings
                            </h1>

                            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[#7B6A61]">
                                Manage restaurant information, delivery options, payment
                                settings and operational preferences.
                            </p>
                        </div>

                        <div className="flex h-12 items-center gap-2 rounded-2xl border border-[#EADDCF] bg-white/70 px-4 text-sm font-black text-[#7B6A61]">
                            <ShieldCheck className="h-4 w-4 text-[#C7192E]" />
                            Owner / Admin access
                        </div>
                    </div>
                </section>

                {businessSettings.id ? (
                    <BusinessSettingsForm settings={businessSettings} />
                ) : (
                    <section className="rounded-[2rem] border border-[#E51B23]/15 bg-[#E51B23]/8 p-6 text-sm font-bold text-[#C7192E]">
                        Business settings table is empty. Run the SQL seed query in
                        Supabase first.
                    </section>
                )}
            </div>
        </AdminShell>
    );
}