import { CartSummary } from "@/components/CartSummary";

export default function CartPage() {
  return (
    <main className="container-page py-16">
      <div className="mb-10">
        <p className="font-black uppercase tracking-[0.25em] text-paprika">
          Cart
        </p>
        <h1 className="section-title mt-3">Your order</h1>
      </div>

      <CartSummary />
    </main>
  );
}
