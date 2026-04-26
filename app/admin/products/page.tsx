import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { canManageProducts } from "@/lib/auth/roles";
import { ProductActions } from "@/components/admin/ProductActions";

export default async function AdminProductsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/admin/products");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

 if (!canManageProducts(profile?.role)) redirect("/unauthorized");

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .order("sort_order", { ascending: true });

  return (
    <main className="container-page py-12">
      <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-black uppercase tracking-[0.25em] text-paprika">
            Admin
          </p>
          <h1 className="section-title mt-3">Products</h1>
        </div>

        <Link href="/admin/products/new" className="btn-primary gap-2">
          <Plus size={18} />
          Add product
        </Link>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="grid grid-cols-[90px_1fr_120px_120px_120px] gap-4 border-b border-dark/10 px-5 py-4 text-xs font-black uppercase tracking-[0.18em] text-dark/40">
          <div>Photo</div>
          <div>Name</div>
          <div>Price</div>
          <div>Status</div>
          <div></div>
        </div>

        {products?.map((product) => (
          <div
            key={product.id}
            className="grid grid-cols-[90px_1fr_120px_120px_120px] items-center gap-4 border-b border-dark/10 px-5 py-4 last:border-b-0"
          >
            <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-paprika/10">
              {product.image_url ? (
                <Image
                  src={product.image_url}
                  alt={product.name}
                  fill
                  sizes="64px"
                  className="object-contain p-1"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-2xl">
                  🍽️
                </div>
              )}
            </div>

            <div>
              <p className="font-black text-dark">{product.name}</p>
              <p className="text-sm text-dark/50">{product.category}</p>
            </div>

            <p className="font-black text-paprika">{product.price} kr</p>

            <p className="text-sm font-bold">
              {product.is_available ? "Active" : "Hidden"}
            </p>

            <div className="flex items-center justify-end gap-3">
              <Link
                href={`/admin/products/${product.id}/edit`}
                className="btn-secondary px-4 py-2"
              >
                Edit
              </Link>

              <ProductActions
                productId={product.id}
                isAvailable={product.is_available}
              />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}