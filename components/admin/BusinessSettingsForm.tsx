"use client";

import { useMemo, useState } from "react";
import {
    Bell,
    Building2,
    CheckCircle2,
    Clock,
    CreditCard,
    Mail,
    MapPin,
    Save,
    Truck
} from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

export type BusinessSettings = {
    id: string;

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
};

function SectionCard({
                         icon: Icon,
                         title,
                         description,
                         children
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
                       type = "text"
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
                       onChange
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

export function BusinessSettingsForm({
                                         settings
                                     }: BusinessSettingsFormProps) {
    const supabase = useMemo(() => createClient(), []);

    const [form, setForm] = useState<BusinessSettings>(settings);
    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    function updateField<K extends keyof BusinessSettings>(
        key: K,
        value: BusinessSettings[K]
    ) {
        setForm((current) => ({
            ...current,
            [key]: value
        }));
    }

    async function saveSettings() {
        setIsSaving(true);
        setSuccessMessage("");
        setErrorMessage("");

        const { error } = await supabase
            .from("business_settings")
            .update({
                business_name: form.business_name,
                brand_name: form.brand_name,

                support_email: form.support_email,
                booking_email: form.booking_email,
                phone: form.phone,

                location: form.location,
                address: form.address,

                delivery_enabled: form.delivery_enabled,
                pickup_enabled: form.pickup_enabled,
                estimated_delivery_time: form.estimated_delivery_time,
                delivery_area: form.delivery_area,

                cash_enabled: form.cash_enabled,
                card_enabled: form.card_enabled,
                swish_enabled: form.swish_enabled,

                monday_friday_hours: form.monday_friday_hours,
                saturday_hours: form.saturday_hours,
                sunday_hours: form.sunday_hours,
                holiday_mode: form.holiday_mode,

                new_order_alerts: form.new_order_alerts,
                kitchen_updates: form.kitchen_updates,
                low_stock_alerts: form.low_stock_alerts,
                email_notifications: form.email_notifications,

                updated_at: new Date().toISOString()
            })
            .eq("id", form.id);

        setIsSaving(false);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        setSuccessMessage("Settings saved successfully.");
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
                    title="Business information"
                    description="Public information used across the website and order flow."
                >
                    <div className="grid gap-4 sm:grid-cols-2">
                        <TextField
                            label="Business name"
                            value={form.business_name}
                            onChange={(value) => updateField("business_name", value)}
                        />
                        <TextField
                            label="Brand name"
                            value={form.brand_name}
                            onChange={(value) => updateField("brand_name", value)}
                        />
                        <TextField
                            label="Location"
                            value={form.location || ""}
                            onChange={(value) => updateField("location", value)}
                        />
                        <TextField
                            label="Address"
                            value={form.address || ""}
                            onChange={(value) => updateField("address", value)}
                            placeholder="Restaurant address"
                        />
                    </div>
                </SectionCard>

                <SectionCard
                    icon={Mail}
                    title="Contact details"
                    description="Customer support and booking contact channels."
                >
                    <div className="grid gap-4 sm:grid-cols-2">
                        <TextField
                            label="Support email"
                            type="email"
                            value={form.support_email || ""}
                            onChange={(value) => updateField("support_email", value)}
                        />
                        <TextField
                            label="Booking email"
                            type="email"
                            value={form.booking_email || ""}
                            onChange={(value) => updateField("booking_email", value)}
                        />
                        <TextField
                            label="Phone"
                            value={form.phone || ""}
                            onChange={(value) => updateField("phone", value)}
                            placeholder="+46..."
                        />
                    </div>
                </SectionCard>

                <SectionCard
                    icon={Truck}
                    title="Delivery settings"
                    description="Delivery and pickup options for customer orders."
                >
                    <div className="grid gap-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <TextField
                                label="Estimated time"
                                value={form.estimated_delivery_time || ""}
                                onChange={(value) =>
                                    updateField("estimated_delivery_time", value)
                                }
                            />
                            <TextField
                                label="Delivery area"
                                value={form.delivery_area || ""}
                                onChange={(value) => updateField("delivery_area", value)}
                            />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <ToggleRow
                                label="Delivery"
                                description="Allow customers to select delivery."
                                checked={form.delivery_enabled}
                                onChange={(value) => updateField("delivery_enabled", value)}
                            />
                            <ToggleRow
                                label="Pickup"
                                description="Allow customers to select pickup."
                                checked={form.pickup_enabled}
                                onChange={(value) => updateField("pickup_enabled", value)}
                            />
                        </div>
                    </div>
                </SectionCard>

                <SectionCard
                    icon={CreditCard}
                    title="Payment settings"
                    description="Payment methods available during checkout."
                >
                    <div className="grid gap-3">
                        <ToggleRow
                            label="Cash"
                            description="Allow cash payment at pickup or delivery."
                            checked={form.cash_enabled}
                            onChange={(value) => updateField("cash_enabled", value)}
                        />
                        <ToggleRow
                            label="Card"
                            description="Allow card payments through Stripe."
                            checked={form.card_enabled}
                            onChange={(value) => updateField("card_enabled", value)}
                        />
                        <ToggleRow
                            label="Swish"
                            description="Enable Swish payments when integration is ready."
                            checked={form.swish_enabled}
                            onChange={(value) => updateField("swish_enabled", value)}
                        />
                    </div>
                </SectionCard>

                <SectionCard
                    icon={Clock}
                    title="Opening hours"
                    description="Basic schedule for restaurant availability."
                >
                    <div className="grid gap-4">
                        <TextField
                            label="Monday - Friday"
                            value={form.monday_friday_hours || ""}
                            onChange={(value) => updateField("monday_friday_hours", value)}
                            placeholder="10:00 - 20:00"
                        />
                        <TextField
                            label="Saturday"
                            value={form.saturday_hours || ""}
                            onChange={(value) => updateField("saturday_hours", value)}
                            placeholder="11:00 - 21:00"
                        />
                        <TextField
                            label="Sunday"
                            value={form.sunday_hours || ""}
                            onChange={(value) => updateField("sunday_hours", value)}
                            placeholder="Closed"
                        />
                        <ToggleRow
                            label="Holiday mode"
                            description="Temporarily mark restaurant as unavailable."
                            checked={form.holiday_mode}
                            onChange={(value) => updateField("holiday_mode", value)}
                        />
                    </div>
                </SectionCard>

                <SectionCard
                    icon={Bell}
                    title="Notifications"
                    description="Operational alerts for orders and staff activity."
                >
                    <div className="grid gap-3">
                        <ToggleRow
                            label="New order alerts"
                            description="Show alerts when new orders arrive."
                            checked={form.new_order_alerts}
                            onChange={(value) => updateField("new_order_alerts", value)}
                        />
                        <ToggleRow
                            label="Kitchen updates"
                            description="Notify when kitchen status changes."
                            checked={form.kitchen_updates}
                            onChange={(value) => updateField("kitchen_updates", value)}
                        />
                        <ToggleRow
                            label="Low stock alerts"
                            description="Highlight low stock products in admin."
                            checked={form.low_stock_alerts}
                            onChange={(value) => updateField("low_stock_alerts", value)}
                        />
                        <ToggleRow
                            label="Email notifications"
                            description="Send operational email notifications."
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
                                Business settings
                            </p>
                            <p className="text-xs font-medium text-[#7B6A61]">
                                Changes are saved directly to Supabase.
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
                        {isSaving ? "Saving..." : "Save settings"}
                    </button>
                </div>
            </section>
        </div>
    );
}