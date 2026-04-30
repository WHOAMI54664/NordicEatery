import { getTranslations } from "next-intl/server";

export default async function PrivacyPage() {
    const t = await getTranslations("pages.privacy");

    const sections = [
        ["dataTitle", "dataText"],
        ["usageTitle", "usageText"],
        ["paymentsTitle", "paymentsText"],
        ["storageTitle", "storageText"],
        ["rightsTitle", "rightsText"],
        ["contactTitle", "contactText"],
    ];

    return (
        <main className="min-h-screen px-6 py-24">
            <div className="mx-auto max-w-4xl">
                <h1 className="mt-1 text-5xl font-black text-dark">{t("title")}</h1>

                <p className="mt-6 max-w-2xl text-lg leading-8 text-dark/60">
                    {t("subtitle")}
                </p>

                <div className="mt-12 space-y-6">
                    {sections.map(([title, text]) => (
                        <section
                            key={title}
                            className="rounded-3xl bg-white/70 p-6 shadow-md backdrop-blur"
                        >
                            <h2 className="text-2xl font-black text-dark">{t(title)}</h2>
                            <p className="mt-3 leading-7 text-dark/60">{t(text)}</p>
                        </section>
                    ))}
                </div>
            </div>
        </main>
    );
}