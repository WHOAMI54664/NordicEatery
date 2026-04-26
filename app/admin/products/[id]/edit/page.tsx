import { notFound, redirect } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";
import { canManageProducts } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

type EditProductPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditProductPage({
  params,
}: EditProductPageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=/admin/products/${id}/edit`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!canManageProducts(profile?.role)) redirect("/unauthorized");

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (!product) notFound();

  return (
    <main className="container-page py-12">
      <div className="mb-10">
        <p className="font-black uppercase tracking-[0.25em] text-paprika">
          Admin
        </p>
        <h1 className="section-title mt-3">Edit product</h1>
      </div>

      <ProductForm mode="edit" product={product} />
    </main>
  );
}