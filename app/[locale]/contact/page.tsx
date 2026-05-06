import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EditableText } from "@/components/EditableText";
import { createClient } from "@/lib/supabase/server";

export default async function ContactPage({
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

  const t = await getTranslations("pages.contact");

  const { data: siteContent } = await supabase
      .from("site_content")
      .select("key,value")
      .eq("locale", locale)
      .eq("page", "contact");

  const content = new Map(
      (siteContent || []).map((item) => [item.key, item.value])
  );

  function text(key: string, fallbackKey: string) {
    return content.get(key) || t(fallbackKey);
  }

  function value(key: string, fallback: string) {
    return content.get(key) || fallback;
  }

  const phoneValue = value("contact.phoneValue", "+46 73 421 89 25");
  const emailValue = value("contact.emailValue", "kontakt@nordiceatery.se");
  const addressValue = value(
      "contact.addressValue",
      "Unbyn 7, 961 93, Boden Sweden"
  );

  return (
      <main className="min-h-screen px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <section className="text-center">
            <h1 className="mt-1 text-5xl font-black text-dark">
              <EditableText
                  value={text("contact.title", "title")}
                  textKey="contact.title"
                  locale={locale}
                  page="contact"
                  canEdit={isOwner}
                  as="span"
              />
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-dark/60">
              <EditableText
                  value={text("contact.subtitle", "subtitle")}
                  textKey="contact.subtitle"
                  locale={locale}
                  page="contact"
                  canEdit={isOwner}
                  as="span"
              />
            </p>
          </section>

          <section className="mt-16 grid gap-6 md:grid-cols-3">
            <a
                href={`tel:${phoneValue.replace(/\s/g, "")}`}
                className="rounded-3xl bg-white/70 p-6 shadow-md backdrop-blur transition hover:-translate-y-1 hover:shadow-xl"
            >
              <Phone className="text-paprika" size={28} />

              <h3 className="mt-5 text-xl font-black text-dark">
                <EditableText
                    value={text("contact.phone", "phone")}
                    textKey="contact.phone"
                    locale={locale}
                    page="contact"
                    canEdit={isOwner}
                    as="span"
                />
              </h3>

              <p className="mt-2 text-sm text-dark/60">
                <EditableText
                    value={phoneValue}
                    textKey="contact.phoneValue"
                    locale={locale}
                    page="contact"
                    canEdit={isOwner}
                    as="span"
                />
              </p>
            </a>

            <a
                href={`mailto:${emailValue}`}
                className="rounded-3xl bg-white/70 p-6 shadow-md backdrop-blur transition hover:-translate-y-1 hover:shadow-xl"
            >
              <Mail className="text-paprika" size={28} />

              <h3 className="mt-5 text-xl font-black text-dark">
                <EditableText
                    value={text("contact.email", "email")}
                    textKey="contact.email"
                    locale={locale}
                    page="contact"
                    canEdit={isOwner}
                    as="span"
                />
              </h3>

              <p className="mt-2 text-sm text-dark/60">
                <EditableText
                    value={emailValue}
                    textKey="contact.emailValue"
                    locale={locale}
                    page="contact"
                    canEdit={isOwner}
                    as="span"
                />
              </p>
            </a>

            <div className="rounded-3xl bg-white/70 p-6 shadow-md backdrop-blur">
              <MapPin className="text-paprika" size={28} />

              <h3 className="mt-5 text-xl font-black text-dark">
                <EditableText
                    value={text("contact.location", "location")}
                    textKey="contact.location"
                    locale={locale}
                    page="contact"
                    canEdit={isOwner}
                    as="span"
                />
              </h3>

              <p className="mt-2 text-sm text-dark/60">
                <EditableText
                    value={addressValue}
                    textKey="contact.addressValue"
                    locale={locale}
                    page="contact"
                    canEdit={isOwner}
                    as="span"
                />
              </p>
            </div>
          </section>

          <section className="mt-16 grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl bg-white/70 p-6 shadow-md backdrop-blur">
              <h3 className="text-xl font-black text-dark">
                <EditableText
                    value={text("contact.businessTitle", "businessTitle")}
                    textKey="contact.businessTitle"
                    locale={locale}
                    page="contact"
                    canEdit={isOwner}
                    as="span"
                />
              </h3>

              <div className="mt-4 space-y-2 text-sm leading-6 text-dark/60">
                <p>
                <span className="font-black text-dark">
                  <EditableText
                      value={text("contact.businessName", "businessName")}
                      textKey="contact.businessName"
                      locale={locale}
                      page="contact"
                      canEdit={isOwner}
                      as="span"
                  />
                  :
                </span>{" "}
                  <EditableText
                      value={value("contact.businessNameValue", "Nordic Eatery")}
                      textKey="contact.businessNameValue"
                      locale={locale}
                      page="contact"
                      canEdit={isOwner}
                      as="span"
                  />
                </p>

                <p>
                <span className="font-black text-dark">
                  <EditableText
                      value={text("contact.businessCountry", "businessCountry")}
                      textKey="contact.businessCountry"
                      locale={locale}
                      page="contact"
                      canEdit={isOwner}
                      as="span"
                  />
                  :
                </span>{" "}
                  <EditableText
                      value={value(
                          "contact.businessCountryValue",
                          "Unbyn 7, 961 93, Boden, Sweden"
                      )}
                      textKey="contact.businessCountryValue"
                      locale={locale}
                      page="contact"
                      canEdit={isOwner}
                      as="span"
                  />
                </p>

                <p>
                <span className="font-black text-dark">
                  <EditableText
                      value={text("contact.businessWebsite", "businessWebsite")}
                      textKey="contact.businessWebsite"
                      locale={locale}
                      page="contact"
                      canEdit={isOwner}
                      as="span"
                  />
                  :
                </span>{" "}
                  <EditableText
                      value={value("contact.businessWebsiteValue", "nordiceatery.se")}
                      textKey="contact.businessWebsiteValue"
                      locale={locale}
                      page="contact"
                      canEdit={isOwner}
                      as="span"
                  />
                </p>
              </div>
            </div>

            <div className="rounded-3xl bg-white/70 p-6 shadow-md backdrop-blur">
              <h3 className="text-xl font-black text-dark">
                <EditableText
                    value={text("contact.supportTitle", "supportTitle")}
                    textKey="contact.supportTitle"
                    locale={locale}
                    page="contact"
                    canEdit={isOwner}
                    as="span"
                />
              </h3>

              <p className="mt-4 text-sm leading-6 text-dark/60">
                <EditableText
                    value={text("contact.supportText", "supportText")}
                    textKey="contact.supportText"
                    locale={locale}
                    page="contact"
                    canEdit={isOwner}
                    as="span"
                />
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link href={`/${locale}/terms`} className="btn-secondary">
                  <EditableText
                      value={text("contact.termsLink", "termsLink")}
                      textKey="contact.termsLink"
                      locale={locale}
                      page="contact"
                      canEdit={isOwner}
                      as="span"
                  />
                </Link>

                <Link href={`/${locale}/privacy`} className="btn-secondary">
                  <EditableText
                      value={text("contact.privacyLink", "privacyLink")}
                      textKey="contact.privacyLink"
                      locale={locale}
                      page="contact"
                      canEdit={isOwner}
                      as="span"
                  />
                </Link>
              </div>
            </div>
          </section>

          <section className="mt-16 rounded-[2rem] bg-gradient-to-r from-paprika to-orange-400 p-10 text-center text-white shadow-xl">
            <h2 className="text-3xl font-black">
              <EditableText
                  value={text("contact.ctaTitle", "ctaTitle")}
                  textKey="contact.ctaTitle"
                  locale={locale}
                  page="contact"
                  canEdit={isOwner}
                  as="span"
              />
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-white/90">
              <EditableText
                  value={text("contact.ctaText", "ctaText")}
                  textKey="contact.ctaText"
                  locale={locale}
                  page="contact"
                  canEdit={isOwner}
                  as="span"
              />
            </p>

            <Link href={`/${locale}/booking`} className="btn-secondary mt-8 inline-flex">
              <EditableText
                  value={text("contact.ctaButton", "ctaButton")}
                  textKey="contact.ctaButton"
                  locale={locale}
                  page="contact"
                  canEdit={isOwner}
                  as="span"
              />
            </Link>
          </section>
        </div>
      </main>
  );
}