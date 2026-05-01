import { getTranslations } from "next-intl/server";
import { CartSummary } from "@/components/CartSummary";

export default async function CartPage() {
    const t = await getTranslations("pages.cart");

    return (
        <main className="container-page py-16">
            <div className="mb-10">
                <p className="font-black uppercase tracking-[0.25em] text-paprika">
                    {t("eyebrow")}
                </p>

                <h1 className="section-title mt-3">{t("title")}</h1>
            </div>

            <CartSummary />
        </main>
    );
}