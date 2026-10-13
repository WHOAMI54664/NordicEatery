import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import { lufga } from "@/app/fonts";
import { Analytics } from "@vercel/analytics/next";
import { getLocale } from "next-intl/server";
import { GoogleTagManager } from "@next/third-parties/google";

const baseUrl = "https://www.nordiceatery.se";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),

  applicationName: "Nordic Eatery",
  title: {
    default: "Nordic Eatery | Local Soul, Global Taste.",
    template: "%s | Nordic Eatery",
  },
  description:
    "Nordic Eatery – Local Soul, Global Taste. Takeaway, catering and food truck service in Sweden.",

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
    type: "website",
    siteName: "Nordic Eatery",
    title: "Nordic Eatery | Local Soul, Global Taste.",
    description:
      "Local Soul, Global Taste. Takeaway, catering and food truck service in Sweden.",
    url: baseUrl,
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Nordic Eatery – Local Soul, Global Taste.",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Nordic Eatery | Local Soul, Global Taste.",
    description:
      "Local Soul, Global Taste. Takeaway, catering and food truck service in Sweden.",
    images: ["/og-image.jpg"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#B51F26",
};

const restaurantJsonLd = {
  "@context": "https://schema.org",
  "@type": "Restaurant",
  "@id": `${baseUrl}/#restaurant`,
  name: "Nordic Eatery",
  url: baseUrl,
  logo: `${baseUrl}/logo.png`,
  image: `${baseUrl}/og-image.jpg`,
  telephone: "+46734218925",
  email: "kontakt@nordiceatery.se",
  servesCuisine: ["Polish food", "Street food", "Comfort food"],
  priceRange: "$$",
  areaServed: { "@type": "AdministrativeArea", name: "Norrbotten" },
  sameAs: [
    "https://www.facebook.com/people/Mikes/61578834173310/",
    "https://www.instagram.com/mikesfry",
    "https://www.tiktok.com/@mikes_streetfood",
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;

  return (
    <html lang={locale} className={lufga.variable}>
      {gtmId ? <GoogleTagManager gtmId={gtmId} /> : null}

      <body className="font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(restaurantJsonLd).replace(/</g, "\\u003c"),
          }}
        />

        <CartProvider>{children}</CartProvider>

        <Analytics />
      </body>
    </html>
  );
}
