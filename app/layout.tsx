import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import { lufga } from "@/app/fonts";

export const metadata: Metadata = {
    title: "Mike's Food | Polish Kitchen",
    description: "Fresh Polish comfort food, made fresh and delivered hot.",
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