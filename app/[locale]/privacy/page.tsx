import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { EditableText } from "@/components/EditableText";
import { LegalBlocksManager } from "@/components/LegalBlocksManager";

export default async function PrivacyPage({
                                              params,
                                          }: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    let canEdit = false;

    if (user) {
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        canEdit = profile?.role === "owner" || profile?.role === "admin";
    }

    const t = await getTranslations("pages.privacy");

    const { data: siteContent } = await supabase
        .from("site_content")
        .select("key,value")
        .eq("locale", locale)
        .eq("page", "privacy");

    const { data: customBlocks } = await supabase
        .from("site_blocks")
        .select("*")
        .eq("locale", locale)
        .eq("page", "privacy")
        .order("sort_order", { ascending: true });

    const content = new Map(
        (siteContent || []).map((item) => [item.key, item.value])
    );

    function text(key: string, fallbackKey: string) {
        return content.get(key) || t(fallbackKey);
    }

    const sections = [
        {
            titleKey: "privacy.dataTitle",
            textKey: "privacy.dataText",
            fallbackTitle: "dataTitle",
            fallbackText: "dataText",
        },
        {
            titleKey: "privacy.usageTitle",
            textKey: "privacy.usageText",
            fallbackTitle: "usageTitle",
            fallbackText: "usageText",
        },
        {
            titleKey: "privacy.paymentsTitle",
            textKey: "privacy.paymentsText",
            fallbackTitle: "paymentsTitle",
            fallbackText: "paymentsText",
        },
        {
            titleKey: "privacy.storageTitle",
            textKey: "privacy.storageText",
            fallbackTitle: "storageTitle",
            fallbackText: "storageText",
        },
        {
            titleKey: "privacy.rightsTitle",
            textKey: "privacy.rightsText",
            fallbackTitle: "rightsTitle",
            fallbackText: "rightsText",
        },
        {
            titleKey: "privacy.contactTitle",
            textKey: "privacy.contactText",
            fallbackTitle: "contactTitle",
            fallbackText: "contactText",
        },
    ];

    return (
        <main className="min-h-screen px-6 py-24">
            <div className="mx-auto max-w-4xl">
                <h1 className="mt-1 text-5xl font-black text-dark">
                    <EditableText
                        value={text("privacy.title", "title")}
                        textKey="privacy.title"
                        locale={locale}
                        page="privacy"
                        canEdit={canEdit}
                        as="span"
                    />
                </h1>

                <p className="mt-6 max-w-2xl text-lg leading-8 text-dark/60">
                    <EditableText
                        value={text("privacy.subtitle", "subtitle")}
                        textKey="privacy.subtitle"
                        locale={locale}
                        page="privacy"
                        canEdit={canEdit}
                        as="span"
                    />
                </p>

                <div className="mt-12 space-y-6">
                    {sections.map((section) => (
                        <section
                            key={section.titleKey}
                            className="rounded-3xl bg-white/70 p-6 shadow-md backdrop-blur"
                        >
                            <h2 className="text-2xl font-black text-dark">
                                <EditableText
                                    value={text(section.titleKey, section.fallbackTitle)}
                                    textKey={section.titleKey}
                                    locale={locale}
                                    page="privacy"
                                    canEdit={canEdit}
                                    as="span"
                                />
                            </h2>

                            <p className="mt-3 leading-7 text-dark/60">
                                <EditableText
                                    value={text(section.textKey, section.fallbackText)}
                                    textKey={section.textKey}
                                    locale={locale}
                                    page="privacy"
                                    canEdit={canEdit}
                                    as="span"
                                />
                            </p>
                        </section>
                    ))}
                </div>

                <LegalBlocksManager
                    page="privacy"
                    locale={locale}
                    canEdit={canEdit}
                    initialBlocks={customBlocks || []}
                />
            </div>
        </main>
    );
}