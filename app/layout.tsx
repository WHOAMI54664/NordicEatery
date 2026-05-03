import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import { lufga } from "@/app/fonts";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
    metadataBase: new URL("https://www.nordiceatery.se"),

    title: {
        default: "Food delivery in Boden | Nordic Eatery",
        template: "%s | Nordic Eatery",
    },

    description:
        "Order fresh Polish comfort food, burgers, fries and street food in Boden. Fast takeaway and delivery in 30–40 minutes.",

    keywords: [
        "food delivery Boden",
        "takeaway Boden",
        "Polish food Boden",
        "Polish street food Boden",
        "Maczanka Boden",
        "Knysza Boden",
        "street food Boden",
        "catering Boden",
        "matleverans Boden",
        "polsk mat Boden",
    ],

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

    openGraph: {
        title: "Food delivery in Boden | Nordic Eatery",
        description:
            "Fresh Polish comfort food, burgers, fries and street food in Boden. Fast takeaway and delivery in 30–40 minutes.",
        url: "https://www.nordiceatery.se",
        siteName: "Nordic Eatery",
        locale: "en_SE",
        type: "website",
        images: [
            {
                url: "/og-image.jpg",
                width: 1200,
                height: 630,
                alt: "Nordic Eatery food delivery in Boden",
            },
        ],
    },

    twitter: {
        card: "summary_large_image",
        title: "Food delivery in Boden | Nordic Eatery",
        description:
            "Order fresh Polish comfort food, burgers, fries and street food in Boden.",
        images: ["/og-image.jpg"],
    },

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

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className={lufga.variable}>
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