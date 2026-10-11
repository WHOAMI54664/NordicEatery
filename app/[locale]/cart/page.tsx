import { publicPageMetadata } from "@/lib/public-page-metadata";
import { EditableMessage } from "@/components/site-content/EditableMessage";
import { CartSummary } from "@/components/CartSummary";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return publicPageMetadata(locale, "cart");
}

export default async function CartPage() {
  return (
    <main className="container-page py-16">
      <div className="mb-10">
        <h1 className="section-title">
          <EditableMessage namespace="pages.cart" messageKey="title" />
        </h1>
      </div>

      <CartSummary />
    </main>
  );
}
