import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-dark/10 bg-cream/60">
      <div className="container-page py-12">
        <div className="grid gap-10 md:grid-cols-3">

          {/* Brand */}
          <div>
            <p className="text-2xl font-black text-paprika">Eatery</p>
            <p className="mt-3 text-sm text-dark/60">
              Polish comfort food, made fresh and delivered hot.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-dark/50">
              Menu
            </p>

            <div className="mt-4 flex flex-col gap-2 text-sm font-semibold text-dark/70">
              <Link href="/menu" className="hover:text-paprika transition">
                Full menu
              </Link>
              <Link href="/cart" className="hover:text-paprika transition">
                Cart
              </Link>
              <Link href="/checkout" className="hover:text-paprika transition">
                Checkout
              </Link>
            </div>
          </div>

          {/* Info */}
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-dark/50">
              Info
            </p>

            <div className="mt-4 flex flex-col gap-2 text-sm font-semibold text-dark/70">
              <p>Delivery: 30–40 min</p>
              <p>Boden, Sweden</p>
              <p>Open: 11:00 – 22:00</p>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-dark/10 pt-6 text-sm text-dark/50 sm:flex-row">
          <p>© {new Date().getFullYear()} Eatery</p>

          <div className="flex gap-6">
            <Link href="#" className="hover:text-paprika transition">
              Privacy
            </Link>
            <Link href="#" className="hover:text-paprika transition">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}