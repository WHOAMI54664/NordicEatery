"use client";

import Link from "next/link";
import { ShoppingBag, Clock } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import { StaffAccountMenu } from "@/components/StaffAccountMenu";
import Image from "next/image";

export function Header() {
  const { totalItems } = useCart();

  return (
    <header className="sticky top-0 z-50 border-b border-white/60 bg-cream/75 shadow-sm backdrop-blur-2xl">
      <div className="container-page flex h-20 items-center justify-between gap-4">
       <Link href="/" className="flex items-center">
         <Image
           src="/logo.png"
           alt="Eatery logo"
           width={180}
           height={70}
           className="object-contain"
           priority
         />
       </Link>

        <nav className="hidden items-center gap-8 text-sm font-bold text-dark/70 md:flex">
          <Link href="/menu" className="transition hover:text-paprika">
            Menu
          </Link>
          <Link href="/checkout" className="transition hover:text-paprika">
            Checkout
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-xs font-black text-dark/50 shadow-sm lg:flex">
            <Clock size={15} className="text-paprika" />
            Delivery in 30–40 min
          </div>

          <StaffAccountMenu />

          <Link href="/cart" className="btn-secondary gap-2 px-4 py-2.5">
            <ShoppingBag size={18} />
            <span className="hidden sm:inline">Cart</span>
            {totalItems > 0 && (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-paprika px-2 text-xs font-black text-white">
                {totalItems}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}