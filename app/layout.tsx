import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { CartProvider } from "@/components/CartProvider";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Mike’s Food | Polish Kitchen",
  description:
    "Authentic Polish street food with Maczanka Krakowska and Knysza."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          <Header />
          {children}
        </CartProvider>
          <Footer />
      </body>
    </html>
  );
}
