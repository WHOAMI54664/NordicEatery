import { ProductCard } from "@/components/ProductCard";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

const categories = [
  { id: "maczanka", titleKey: "maczanka" },
  { id: "knysza", titleKey: "knysza" },
  { id: "fries", titleKey: "fries" },
  { id: "drinks", titleKey: "drinks" },
] as const;

export default async function MenuPage() {
  const supabase = await createClient();
  const t = await getTranslations("pages.menu");

  const { data: menuItems } = await supabase
    .from("products")
    .select("*")
    .eq("is_available", true)
    .or("track_stock.eq.false,stock_quantity.gt.0")
    .order("sort_order", { ascending: true });

  return (
    <main className="container-page py-16">
      <div className="text-center sm:text-left max-w-3xl">
        <p className="font-black uppercase tracking-[0.25em] text-paprika">
          {t("eyebrow")}
        </p>

        <h1 className="section-title mt-3">
          {t("title")}
        </h1>

        <p className="mt-5 text-lg leading-8 text-dark/60">
          {t("subtitle")}
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
                {t(`categories.${category.titleKey}`)}
              </h2>

                <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">
                    {products.map((product) => (
                        <ProductCard key={product.id} product={product} compact />
                    ))}
                </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
