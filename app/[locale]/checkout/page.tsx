import { CheckoutForm } from "@/components/CheckoutForm";
import { createClient } from "@/lib/supabase/server";
import { getPublicShiftStatus } from "@/lib/restaurant/public-shift";

type CheckoutPageProps = {
    params: Promise<{
        locale: string;
    }>;
};

export type CheckoutSettings = {
    delivery_enabled: boolean;
    pickup_enabled: boolean;
    estimated_delivery_time: string | null;
    delivery_area: string | null;

    cash_enabled: boolean;
    card_enabled: boolean;
    swish_enabled: boolean;

    pickup_address: string | null;
};

export default async function CheckoutPage({ params }: CheckoutPageProps) {
    const { locale } = await params;

    const supabase = await createClient();

    const { data: businessSettings } = await supabase
        .from("business_settings")
        .select(
            `
      delivery_enabled,
      pickup_enabled,
      estimated_delivery_time,
      delivery_area,
      cash_enabled,
      card_enabled,
      swish_enabled
    `
        )
        .limit(1)
        .single();

    const shift = await getPublicShiftStatus();

    const settings: CheckoutSettings = {
        delivery_enabled: businessSettings?.delivery_enabled ?? true,
        pickup_enabled: businessSettings?.pickup_enabled ?? true,
        estimated_delivery_time:
            businessSettings?.estimated_delivery_time || "30–40 min",
        delivery_area: businessSettings?.delivery_area || "Boden",

        cash_enabled: businessSettings?.cash_enabled ?? true,
        card_enabled: businessSettings?.card_enabled ?? true,
        swish_enabled: businessSettings?.swish_enabled ?? false,

        pickup_address: shift.isOpen ? shift.locationAddress : null,
    };

    return (
        <main className="container-page py-16">
            <CheckoutForm locale={locale} settings={settings} />
        </main>
    );
}
