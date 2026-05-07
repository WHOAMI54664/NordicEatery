"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { EditableText } from "@/components/EditableText";

type FooterBusinessSettings = {
    business_name?: string | null;
    brand_name?: string | null;
    organization_number?: string | null;
    vat_number?: string | null;
    support_email?: string | null;
    booking_email?: string | null;
    phone?: string | null;
    location?: string | null;
    address?: string | null;
};

type FooterClientProps = {
    canEdit: boolean;
    editableContent: Record<string, string>;
    businessSettings: FooterBusinessSettings | null;
};

function PaymentIcons() {
    const payments = [
        { src: "/payments/visa.svg", alt: "Visa" },
        { src: "/payments/mastercard.svg", alt: "Mastercard" },
        { src: "/payments/swish.svg", alt: "Swish" },
        { src: "/payments/applepay.svg", alt: "Apple Pay" },
    ];

    return (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {payments.map((item) => (
                <div
                    key={item.alt}
                    className="flex h-8 w-14 items-center justify-center rounded-xl border border-dark/10 bg-white/80 shadow-sm sm:h-10 sm:w-16 sm:rounded-2xl"
                >
                    <Image
                        src={item.src}
                        alt={item.alt}
                        width={38}
                        height={20}
                        className="h-4 w-auto object-contain sm:h-5"
                    />
                </div>
            ))}
        </div>
    );
}

export function FooterClient({
                                 canEdit,
                                 editableContent,
                                 businessSettings,
                             }: FooterClientProps) {
    const t = useTranslations("footer");
    const params = useParams();

    const locale = String(params.locale || "en");

    function localePath(path: string) {
        return `/${locale}${path}`;
    }

    function text(key: string, fallbackKey: string) {
        return editableContent[key] || t(fallbackKey);
    }

    function value(key: string, fallback: string) {
        return editableContent[key] || fallback;
    }

    const currentYear = new Date().getFullYear();

    const editableLinkLabels = [
        ["footer.menu", "menu"],
        ["footer.about", "about"],
        ["footer.booking", "booking"],
        ["footer.foodTruck", "foodTruck"],
        ["footer.catering", "catering"],
        ["footer.contact", "contact"],
        ["footer.support", "support"],
        ["footer.terms", "terms"],
        ["footer.privacy", "privacy"],
        ["footer.refunds", "refunds"],
    ] as const;

    return (
        <footer className="mt-12 border-t border-dark/10 bg-cream/60 sm:mt-16">
            <div className="container-page py-8 sm:py-10">
                <div className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-5">
                    <div className="col-span-2 lg:col-span-1">
                        <p className="text-xl font-black text-paprika sm:text-2xl">
                            <EditableText
                                value={text("footer.brand", "brand")}
                                textKey="footer.brand"
                                locale={locale}
                                page="footer"
                                canEdit={canEdit}
                                as="span"
                            />
                        </p>

                        <p className="mt-2 max-w-xs text-sm leading-6 text-dark/60">
                            <EditableText
                                value={text("footer.tagline", "tagline")}
                                textKey="footer.tagline"
                                locale={locale}
                                page="footer"
                                canEdit={canEdit}
                                as="span"
                            />
                        </p>

                        <div className="mt-5">
                            <p className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-dark/45">
                                <EditableText
                                    value={text("footer.payments", "payments")}
                                    textKey="footer.payments"
                                    locale={locale}
                                    page="footer"
                                    canEdit={canEdit}
                                    as="span"
                                />
                            </p>

                            <PaymentIcons />
                        </div>
                    </div>

                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.25em] text-dark/45">
                            <EditableText
                                value={text("footer.navigation", "navigation")}
                                textKey="footer.navigation"
                                locale={locale}
                                page="footer"
                                canEdit={canEdit}
                                as="span"
                            />
                        </p>

                        <div className="mt-3 flex flex-col gap-1.5 text-sm font-semibold text-dark/70 sm:gap-2">
                            <Link href={localePath("/menu")} className="transition hover:text-paprika">
                                {text("footer.menu", "menu")}
                            </Link>

                            <Link href={localePath("/about")} className="transition hover:text-paprika">
                                {text("footer.about", "about")}
                            </Link>

                            <Link href={localePath("/booking")} className="transition hover:text-paprika">
                                {text("footer.booking", "booking")}
                            </Link>

                            <Link href={localePath("/mikes")} className="transition hover:text-paprika">
                                {text("footer.foodTruck", "foodTruck")}
                            </Link>
                        </div>
                    </div>

                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.25em] text-dark/45">
                            <EditableText
                                value={text("footer.services", "services")}
                                textKey="footer.services"
                                locale={locale}
                                page="footer"
                                canEdit={canEdit}
                                as="span"
                            />
                        </p>

                        <div className="mt-3 flex flex-col gap-1.5 text-sm font-semibold text-dark/70 sm:gap-2">
                            <Link href={localePath("/catering")} className="transition hover:text-paprika">
                                {text("footer.catering", "catering")}
                            </Link>

                            <Link href={localePath("/contact")} className="transition hover:text-paprika">
                                {text("footer.contact", "contact")}
                            </Link>

                            <Link href={localePath("/support")} className="transition hover:text-paprika">
                                {text("footer.support", "support")}
                            </Link>
                        </div>
                    </div>

                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.25em] text-dark/45">
                            <EditableText
                                value={value("footer.legalTitle", "Legal")}
                                textKey="footer.legalTitle"
                                locale={locale}
                                page="footer"
                                canEdit={canEdit}
                                as="span"
                            />
                        </p>

                        <div className="mt-3 flex flex-col gap-1.5 text-sm font-semibold text-dark/70 sm:gap-2">
                            <Link href={localePath("/terms")} className="transition hover:text-paprika">
                                {text("footer.terms", "terms")}
                            </Link>

                            <Link href={localePath("/privacy")} className="transition hover:text-paprika">
                                {text("footer.privacy", "privacy")}
                            </Link>

                            <Link href={localePath("/contact")} className="transition hover:text-paprika">
                                {text("footer.refunds", "refunds")}
                            </Link>
                        </div>
                    </div>

                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.25em] text-dark/45">
                            <EditableText
                                value={text("footer.businessInfo", "businessInfo")}
                                textKey="footer.businessInfo"
                                locale={locale}
                                page="footer"
                                canEdit={canEdit}
                                as="span"
                            />
                        </p>

                        <div className="mt-3 text-sm font-semibold leading-6 text-dark/70">
                            <p>{businessSettings?.brand_name || "Nordic Eatery"}</p>

                            {businessSettings?.address && <p>{businessSettings.address}</p>}

                            {businessSettings?.location && <p>{businessSettings.location}</p>}

                            {businessSettings?.organization_number && (
                                <p className="mt-2">
                                    Org.nr: {businessSettings.organization_number}
                                </p>
                            )}

                            {businessSettings?.vat_number && (
                                <p>VAT: {businessSettings.vat_number}</p>
                            )}

                            <div className="mt-2">
                                <p className="break-words">
                                    {businessSettings?.support_email || "kontakt@nordiceatery.se"}
                                </p>

                                {businessSettings?.phone && <p>{businessSettings.phone}</p>}
                            </div>
                        </div>
                    </div>
                </div>

                {canEdit && (
                    <div className="mt-8 rounded-[1.5rem] border border-paprika/10 bg-white/70 p-4 shadow-sm backdrop-blur">
                        <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-paprika">
                            Footer edit
                        </p>

                        <div className="flex flex-wrap gap-2">
                            {editableLinkLabels.map(([key, fallbackKey]) => (
                                <span
                                    key={key}
                                    className="rounded-full border border-dark/10 bg-cream px-3 py-2 text-xs font-bold text-dark/70"
                                >
                  <EditableText
                      value={text(key, fallbackKey)}
                      textKey={key}
                      locale={locale}
                      page="footer"
                      canEdit={canEdit}
                      as="span"
                  />
                </span>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mt-8 border-t border-dark/10 pt-5">
                    <div className="flex flex-col items-center justify-between gap-4 text-xs text-dark/50 sm:flex-row">
                        <p>
                            © {currentYear}{" "}
                            <EditableText
                                value={value("footer.copyrightBrand", "NordicEatery")}
                                textKey="footer.copyrightBrand"
                                locale={locale}
                                page="footer"
                                canEdit={canEdit}
                                as="span"
                            />
                        </p>

                        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
                            <Link href={localePath("/terms")} className="transition hover:text-paprika">
                                {text("footer.terms", "terms")}
                            </Link>

                            <Link href={localePath("/privacy")} className="transition hover:text-paprika">
                                {text("footer.privacy", "privacy")}
                            </Link>

                            <Link href={localePath("/contact")} className="transition hover:text-paprika">
                                {text("footer.contact", "contact")}
                            </Link>

                            <Link href={localePath("/support")} className="transition hover:text-paprika">
                                {text("footer.support", "support")}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
