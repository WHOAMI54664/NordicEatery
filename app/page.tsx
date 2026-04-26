import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();

  const { data: featuredItems } = await supabase
    .from("products")
    .select("*")
    .eq("is_available", true)
    .eq("is_popular", true)
    .or("track_stock.eq.false,stock_quantity.gt.0")
    .order("sort_order", { ascending: true })
    .limit(6);

  return (
    <main>
      <section className="container-page pb-20 pt-16 sm:pt-24">
        <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <div className="inline-flex rounded-full border border-paprika/15 bg-white/70 px-4 py-2 text-sm font-black text-paprika backdrop-blur">
              Kitchen & Delivery
            </div>

            <h1 className="mt-7 max-w-2xl text-5xl font-black tracking-[-0.05em] text-dark sm:text-6xl lg:text-7xl">
              Polish food.
              <br />
              Delivered hot.
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-8 text-dark/60">
              Maczanka, Knysza and homemade comfort food from Mike’s kitchen.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/menu" className="btn-primary gap-2">
                Order now
                <ArrowRight size={18} />
              </Link>

              <Link href="/cart" className="btn-secondary">
                View cart
              </Link>
            </div>
          </div>

          <div className="glass-card hero-card-in relative overflow-hidden p-5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,45,45,.28),transparent_45%)]" />

            <div className="relative flex min-h-[520px] items-center justify-center rounded-[1.7rem] bg-gradient-to-br from-[#FF1515] via-paprika to-cherry p-8">
              <div className="absolute inset-x-10 top-1/2 h-32 -translate-y-1/2 rounded-full bg-white/20 blur-3xl" />

              <Image
                src="/mikes_logo.PNG"
                alt="Mike"
                width={540}
                height={540}
                priority
                className="hero-image-in relative mx-auto h-auto w-[82%] max-w-[520px] object-contain drop-shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="container-page pb-14">
        <div className="grid gap-4 md:grid-cols-4">
          {["Maczanka", "Knysza", "Sides", "Drinks"].map((category) => (
            <Link
              key={category}
              href="/menu"
              className="glass-card group p-6 transition hover:-translate-y-1 hover:bg-white"
            >
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-paprika/10 text-2xl">
                {category === "Maczanka"
                  ? "🥪"
                  : category === "Knysza"
                    ? "🌯"
                    : category === "Sides"
                      ? "🍟"
                      : "🥤"}
              </div>

              <p className="text-xl font-black text-dark">{category}</p>
              <p className="mt-2 text-sm text-dark/50">Explore menu</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-page pb-24">
        <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="font-black uppercase tracking-[0.25em] text-paprika">
              Popular
            </p>
            <h2 className="section-title mt-3">Best sellers</h2>
          </div>

          <Link href="/menu" className="btn-secondary">
            Full menu
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {(featuredItems || []).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </main>
  );
}