"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
    Bell,
    Building2,
    CheckCircle2,
    Clock,
    CreditCard,
    Mail,
    Save,
    Truck,
} from "lucide-react";
import { ZReportEmailField } from "@/components/admin/ZReportEmailField";
import { createClient } from "@/lib/supabase/browser";

export type BusinessSettings = {
    id: string;

    organization_number: string | null;
    vat_number: string | null;

    business_name: string;
    brand_name: string;

    support_email: string | null;
    booking_email: string | null;
    phone: string | null;

    location: string | null;
    address: string | null;

    delivery_enabled: boolean;
    pickup_enabled: boolean;
    estimated_delivery_time: string | null;
    delivery_area: string | null;

    cash_enabled: boolean;
    card_enabled: boolean;
    swish_enabled: boolean;

    monday_friday_hours: string | null;
    saturday_hours: string | null;
    sunday_hours: string | null;
    holiday_mode: boolean;

    new_order_alerts: boolean;
    kitchen_updates: boolean;
    low_stock_alerts: boolean;
    email_notifications: boolean;
};

type BusinessSettingsFormProps = {
    settings: BusinessSettings;
    zReportEmail?: string | null;
};

function SectionCard({
                         icon: Icon,
                         title,
                         description,
                         children,
                     }: {
    icon: React.ElementType;
    title: string;
    description: string;
    children: React.ReactNode;
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

            {children}
        </section>
    );
}

function TextField({
                       label,
                       value,
                       onChange,
                       placeholder,
                       type = "text",
                   }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: string;
}) {
    return (
        <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-[#A39388]">
        {label}
      </span>

            <input
                type={type}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className="h-12 w-full rounded-2xl border border-[#EADDCF] bg-white/75 px-4 text-sm font-semibold text-[#25120F] outline-none shadow-inner shadow-[#4C2314]/5 transition placeholder:text-[#A39388] focus:border-[#E51B23]/25 focus:bg-white focus:ring-4 focus:ring-[#E51B23]/8"
            />
        </label>
    );
}

function ToggleRow({
                       label,
                       description,
                       checked,
                       onChange,
                   }: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (value: boolean) => void;
}) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={`flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition ${
                checked
                    ? "border-[#E51B23]/20 bg-[#E51B23]/8"
                    : "border-[#EADDCF] bg-white/70 hover:bg-[#FFF3E2]"
            }`}
        >
      <span>
        <span className="block text-sm font-black text-[#25120F]">
          {label}
        </span>
        <span className="mt-1 block text-xs font-medium leading-5 text-[#7B6A61]">
          {description}
        </span>
      </span>

            <span
                className={`flex h-7 w-12 items-center rounded-full p-1 transition ${
                    checked ? "bg-[#E51B23]" : "bg-[#EADDCF]"
                }`}
            >
        <span
            className={`h-5 w-5 rounded-full bg-white shadow transition ${
                checked ? "translate-x-5" : "translate-x-0"
            }`}
        />
      </span>
        </button>
    );
}

export function BusinessSettingsForm({ settings, zReportEmail }: BusinessSettingsFormProps) {
    const t = useTranslations("admin.businessSettingsForm");
    const supabase = useMemo(() => createClient(), []);

    const [form, setForm] = useState<BusinessSettings>(() => ({
        ...settings,
        business_name: settings.business_name || settings.brand_name || "",
    }));
    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    function updateField<K extends keyof BusinessSettings>(
        key: K,
        value: BusinessSettings[K]
    ) {
        setForm((current) => ({
            ...current,
            [key]: value,
        }));
    }

    async function saveSettings() {
        setIsSaving(true);
        setSuccessMessage("");
        setErrorMessage("");

        const { data, error } = await supabase
            .from("business_settings")
            .update({
                business_name: form.business_name,
                // Keep existing consumers in sync with the single company-name field.
                brand_name: form.business_name,

                organization_number: form.organization_number || null,
                vat_number: form.vat_number || null,

                support_email: form.support_email || null,
                booking_email: form.booking_email || null,
                phone: form.phone || null,

                location: form.location || null,
                address: form.address || null,

                delivery_enabled: form.delivery_enabled,
                pickup_enabled: form.pickup_enabled,
                estimated_delivery_time: form.estimated_delivery_time || null,
                delivery_area: form.delivery_area || null,

                cash_enabled: form.cash_enabled,
                card_enabled: form.card_enabled,
                swish_enabled: form.swish_enabled,

                monday_friday_hours: form.monday_friday_hours || null,
                saturday_hours: form.saturday_hours || null,
                sunday_hours: form.sunday_hours || null,
                holiday_mode: form.holiday_mode,

                new_order_alerts: form.new_order_alerts,
                kitchen_updates: form.kitchen_updates,
                low_stock_alerts: form.low_stock_alerts,
                email_notifications: form.email_notifications,

                updated_at: new Date().toISOString(),
            })
            .eq("id", form.id)
            .select()
            .single();

        setIsSaving(false);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        if (data) {
            setForm(data as BusinessSettings);
        }

        setSuccessMessage(t("messages.success"));
    }

    return (
        <div className="space-y-6">
            {(successMessage || errorMessage) && (
                <div
                    className={`rounded-[1.5rem] border p-4 text-sm font-bold ${
                        successMessage
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                            : "border-[#E51B23]/15 bg-[#E51B23]/8 text-[#C7192E]"
                    }`}
                >
                    {successMessage || errorMessage}
                </div>
            )}

            <section className="grid gap-6 xl:grid-cols-2">
                <SectionCard
                    icon={Building2}
                    title={t("business.title")}
                    description={t("business.description")}
                >
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <TextField
                                label={t("fields.businessName")}
                                value={form.business_name}
                                onChange={(value) => updateField("business_name", value)}
                            />
                        </div>

                        <TextField
                            label={t("fields.location")}
                            value={form.location || ""}
                            onChange={(value) => updateField("location", value)}
                        />

                        <TextField
                            label={t("fields.address")}
                            value={form.address || ""}
                            onChange={(value) => updateField("address", value)}
                            placeholder={t("placeholders.address")}
                        />

                        <TextField
                            label={t("fields.organizationNumber")}
                            value={form.organization_number || ""}
                            onChange={(value) => updateField("organization_number", value)}
                            placeholder="XXXXXX-XXXX"
                        />

                        <TextField
                            label={t("fields.vatNumber")}
                            value={form.vat_number || ""}
                            onChange={(value) => updateField("vat_number", value)}
                            placeholder="SEXXXXXXXXXX01"
                        />
                    </div>
                </SectionCard>

                <SectionCard
                    icon={Mail}
                    title={t("contact.title")}
                    description={t("contact.description")}
                >
                    <div className="grid gap-4 sm:grid-cols-2">
                        <TextField
                            label={t("fields.supportEmail")}
                            type="email"
                            value={form.support_email || ""}
                            onChange={(value) => updateField("support_email", value)}
                        />

                        <TextField
                            label={t("fields.bookingEmail")}
                            type="email"
                            value={form.booking_email || ""}
                            onChange={(value) => updateField("booking_email", value)}
                        />

                        <ZReportEmailField initialEmail={zReportEmail || null} />

                        <TextField
                            label={t("fields.phone")}
                            value={form.phone || ""}
                            onChange={(value) => updateField("phone", value)}
                            placeholder="+46..."
                        />
                    </div>
                </SectionCard>

                <SectionCard
                    icon={Truck}
                    title={t("delivery.title")}
                    description={t("delivery.description")}
                >
                    <div className="grid gap-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <TextField
                                label={t("fields.estimatedTime")}
                                value={form.estimated_delivery_time || ""}
                                onChange={(value) =>
                                    updateField("estimated_delivery_time", value)
                                }
                            />

                            <TextField
                                label={t("fields.deliveryArea")}
                                value={form.delivery_area || ""}
                                onChange={(value) => updateField("delivery_area", value)}
                            />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <ToggleRow
                                label={t("toggles.delivery.label")}
                                description={t("toggles.delivery.description")}
                                checked={form.delivery_enabled}
                                onChange={(value) => updateField("delivery_enabled", value)}
                            />

                            <ToggleRow
                                label={t("toggles.pickup.label")}
                                description={t("toggles.pickup.description")}
                                checked={form.pickup_enabled}
                                onChange={(value) => updateField("pickup_enabled", value)}
                            />
                        </div>
                    </div>
                </SectionCard>

                <SectionCard
                    icon={CreditCard}
                    title={t("payment.title")}
                    description={t("payment.description")}
                >
                    <div className="grid gap-3">
                        <ToggleRow
                            label={t("toggles.cash.label")}
                            description={t("toggles.cash.description")}
                            checked={form.cash_enabled}
                            onChange={(value) => updateField("cash_enabled", value)}
                        />

                        <ToggleRow
                            label={t("toggles.card.label")}
                            description={t("toggles.card.description")}
                            checked={form.card_enabled}
                            onChange={(value) => updateField("card_enabled", value)}
                        />

                        <ToggleRow
                            label={t("toggles.swish.label")}
                            description={t("toggles.swish.description")}
                            checked={form.swish_enabled}
                            onChange={(value) => updateField("swish_enabled", value)}
                        />
                    </div>
                </SectionCard>

                <SectionCard
                    icon={Clock}
                    title={t("hours.title")}
                    description={t("hours.description")}
                >
                    <div className="grid gap-4">
                        <TextField
                            label={t("fields.mondayFriday")}
                            value={form.monday_friday_hours || ""}
                            onChange={(value) => updateField("monday_friday_hours", value)}
                            placeholder="10:00 - 20:00"
                        />

                        <TextField
                            label={t("fields.saturday")}
                            value={form.saturday_hours || ""}
                            onChange={(value) => updateField("saturday_hours", value)}
                            placeholder="11:00 - 21:00"
                        />

                        <TextField
                            label={t("fields.sunday")}
                            value={form.sunday_hours || ""}
                            onChange={(value) => updateField("sunday_hours", value)}
                            placeholder={t("placeholders.closed")}
                        />

                        <ToggleRow
                            label={t("toggles.holidayMode.label")}
                            description={t("toggles.holidayMode.description")}
                            checked={form.holiday_mode}
                            onChange={(value) => updateField("holiday_mode", value)}
                        />
                    </div>
                </SectionCard>

                <SectionCard
                    icon={Bell}
                    title={t("notifications.title")}
                    description={t("notifications.description")}
                >
                    <div className="grid gap-3">
                        <ToggleRow
                            label={t("toggles.newOrderAlerts.label")}
                            description={t("toggles.newOrderAlerts.description")}
                            checked={form.new_order_alerts}
                            onChange={(value) => updateField("new_order_alerts", value)}
                        />

                        <ToggleRow
                            label={t("toggles.kitchenUpdates.label")}
                            description={t("toggles.kitchenUpdates.description")}
                            checked={form.kitchen_updates}
                            onChange={(value) => updateField("kitchen_updates", value)}
                        />

                        <ToggleRow
                            label={t("toggles.lowStockAlerts.label")}
                            description={t("toggles.lowStockAlerts.description")}
                            checked={form.low_stock_alerts}
                            onChange={(value) => updateField("low_stock_alerts", value)}
                        />

                        <ToggleRow
                            label={t("toggles.emailNotifications.label")}
                            description={t("toggles.emailNotifications.description")}
                            checked={form.email_notifications}
                            onChange={(value) => updateField("email_notifications", value)}
                        />
                    </div>
                </SectionCard>
            </section>

            <section className="sticky bottom-4 z-20 rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/95 p-4 shadow-2xl shadow-[#4C2314]/12 backdrop-blur-2xl">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
                            <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                        </div>

                        <div>
                            <p className="text-sm font-black text-[#25120F]">
                                {t("savePanel.title")}
                            </p>

                            <p className="text-xs font-medium text-[#7B6A61]">
                                {t("savePanel.description")}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        disabled={isSaving}
                        onClick={saveSettings}
                        className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#E51B23] px-6 text-sm font-black text-white shadow-lg shadow-[#E51B23]/20 transition hover:bg-[#C7192E] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <Save className="h-4 w-4" />
                        {isSaving ? t("buttons.saving") : t("buttons.save")}
                    </button>
                </div>
            </section>
        </div>
    );
}
