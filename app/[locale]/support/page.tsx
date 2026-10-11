import { publicPageMetadata } from "@/lib/public-page-metadata";
import { getPublicPath } from "@/i18n/paths";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { EditableText } from "@/components/EditableText";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return publicPageMetadata(locale, "support");
}

export default async function SupportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isOwner = false;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    isOwner = profile?.role === "owner" || profile?.role === "admin";
  }

  const t = await getTranslations("pages.support");

  const { data: siteContent } = await supabase
    .from("site_content")
    .select("key,value")
    .eq("locale", locale)
    .eq("page", "support");

  const content = new Map(
    (siteContent || []).map((item) => [item.key, item.value]),
  );

  function text(key: string, fallbackKey: string) {
    return content.get(key) || t(fallbackKey);
  }

  const faqItems = [
    {
      qKey: "support.q1",
      aKey: "support.a1",
      qFallback: "q1",
      aFallback: "a1",
    },
    {
      qKey: "support.q2",
      aKey: "support.a2",
      qFallback: "q2",
      aFallback: "a2",
    },
    {
      qKey: "support.q3",
      aKey: "support.a3",
      qFallback: "q3",
      aFallback: "a3",
    },
    {
      qKey: "support.q4",
      aKey: "support.a4",
      qFallback: "q4",
      aFallback: "a4",
    },
  ];

  return (
    <main className="min-h-screen px-6 py-24">
      <div className="mx-auto max-w-5xl">
        {/* HEADER */}
        <section className="text-center">
          <h1 className="mt-1 text-5xl font-black text-dark">
            <EditableText
              value={text("support.title", "title")}
              textKey="support.title"
              locale={locale}
              page="support"
              canEdit={isOwner}
              as="span"
            />
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-dark/60">
            <EditableText
              value={text("support.subtitle", "subtitle")}
              textKey="support.subtitle"
              locale={locale}
              page="support"
              canEdit={isOwner}
              as="span"
            />
          </p>
        </section>

        {/* FAQ */}
        <section className="mt-16 space-y-6">
          {faqItems.map((item) => (
            <div
              key={item.qKey}
              className="rounded-3xl bg-white/80 p-6 shadow-md backdrop-blur"
            >
              <h3 className="text-lg font-black text-dark">
                <EditableText
                  value={text(item.qKey, item.qFallback)}
                  textKey={item.qKey}
                  locale={locale}
                  page="support"
                  canEdit={isOwner}
                  as="span"
                />
              </h3>

              <p className="mt-2 text-sm text-dark/60">
                <EditableText
                  value={text(item.aKey, item.aFallback)}
                  textKey={item.aKey}
                  locale={locale}
                  page="support"
                  canEdit={isOwner}
                  as="span"
                />
              </p>
            </div>
          ))}
        </section>

        {/* CTA */}
        <section className="mt-16 rounded-[2rem] bg-gradient-to-r from-paprika to-orange-400 p-10 text-center text-white shadow-xl">
          <h2 className="text-3xl font-black">
            <EditableText
              value={text("support.ctaTitle", "ctaTitle")}
              textKey="support.ctaTitle"
              locale={locale}
              page="support"
              canEdit={isOwner}
              as="span"
            />
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-white/90">
            <EditableText
              value={text("support.ctaText", "ctaText")}
              textKey="support.ctaText"
              locale={locale}
              page="support"
              canEdit={isOwner}
              as="span"
            />
          </p>

          <div className="mt-8 flex justify-center gap-3">
            <Link
              href={getPublicPath(locale, "/contact")}
              className="btn-secondary"
            >
              <EditableText
                value={text("support.contact", "contact")}
                textKey="support.contact"
                locale={locale}
                page="support"
                canEdit={isOwner}
                as="span"
              />
            </Link>

            <Link
              href={getPublicPath(locale, "/booking")}
              className="btn-secondary"
            >
              <EditableText
                value={text("support.booking", "booking")}
                textKey="support.booking"
                locale={locale}
                page="support"
                canEdit={isOwner}
                as="span"
              />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
