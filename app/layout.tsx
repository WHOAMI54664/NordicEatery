import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import { lufga } from "@/app/fonts";
import { Analytics } from "@vercel/analytics/next";
import { getLocale } from "next-intl/server";

export const metadata: Metadata = {
    metadataBase: new URL("https://www.nordiceatery.se"),

    icons: {
        icon: [
            { url: "/favicon.ico", sizes: "any" },
            { url: "/favicon.svg", type: "image/svg+xml" },
            { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
            { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
        ],
        shortcut: "/favicon.ico",
        apple: "/apple-touch-icon.png",
    },

    manifest: "/site.webmanifest",

    robots: {
        index: true,
        follow: true,
    },
};

const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: "Nordic Eatery",
    url: "https://www.nordiceatery.se",
    logo: "https://www.nordiceatery.se/logo.png",
    image: "https://www.nordiceatery.se/og-image.jpg",
    telephone: "+46734218925",
    email: "kontakt@nordiceatery.se",
    servesCuisine: ["Polish food", "Street food", "Comfort food"],
    priceRange: "$$",
    address: {
        "@type": "PostalAddress",
        streetAddress: "Unbyn 7",
        postalCode: "961 93",
        addressLocality: "Boden",
        addressCountry: "SE",
    },
    areaServed: {
        "@type": "City",
        name: "Boden",
    },
};

export default async function RootLayout({
                                             children,
                                         }: {
    children: React.ReactNode;
}) {
    const locale = await getLocale();

    return (
        <html lang={locale} className={lufga.variable}>
        <body className="font-sans">
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
                __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c"),
            }}
        />

        <CartProvider>{children}</CartProvider>
        <Analytics />
        </body>
        </html>
    );
}