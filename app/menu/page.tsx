import { ProductCard } from "@/components/ProductCard";
import { createClient } from "@/lib/supabase/server";

const categories = [
  { id: "maczanka", title: "Maczanka" },
  { id: "knysza", title: "Knysza" },
  { id: "sides", title: "Sides" },
  { id: "drinks", title: "Drinks" },
] as const;

export default async function MenuPage() {
  const supabase = await createClient();

  const { data: menuItems } = await supabase
    .from("products")
    .select("*")
    .eq("is_available", true)
    .or("track_stock.eq.false,stock_quantity.gt.0")
    .order("sort_order", { ascending: true });

  return (
    <main className="container-page py-16">
      <div className="max-w-3xl">
        <p className="font-black uppercase tracking-[0.25em] text-paprika">
          Menu
        </p>
        <h1 className="section-title mt-3">Choose your Polish food</h1>
        <p className="mt-5 text-lg leading-8 text-dark/60">
          Fresh dishes made to order and selected items available from stock.
        </p>
      </div>

      <div className="mt-10 space-y-14">
        {categories.map((category) => {
          const products =
            menuItems?.filter((item) => item.category === category.id) || [];

          if (products.length === 0) return null;

          return (
            <section key={category.id} id={category.id}>
              <h2 className="mb-6 text-3xl font-black text-dark">
                {category.title}
              </h2>

              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}