import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import { lufga } from "@/app/fonts";
import { Analytics } from "@vercel/analytics/next"

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
        "burgers Boden",
        "street food Boden",
        "catering Boden",
        "matleverans Boden",
        "takeaway Boden",
    ],
    openGraph: {
        title: "Food delivery in Boden | Nordic Eatery",
        description:
            "Fresh Polish comfort food, burgers, fries and street food in Boden. Fast takeaway and delivery in 30–40 minutes.",
        url: "https://www.nordiceatery.se",
        siteName: "Nordic Eatery",
        locale: "en_SE",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Food delivery in Boden | Nordic Eatery",
        description:
            "Order fresh Polish comfort food, burgers, fries and street food in Boden.",
        icons: {
            icon:"/favicon_192x192.ico"
        }
    },
    robots: {
        index: true,
        follow: true,
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
        <CartProvider>{children}</CartProvider>
        </body>
        </html>
    );
}
