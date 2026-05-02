import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Best burgers in Boden | Nordic Eatery",
    description:
        "Looking for the best burgers in Boden? Try Nordic Eatery – juicy burgers, loaded fries and street food.",
};
<Link href="/delivery-boden">Delivery in Boden</Link>
export default function BurgersBodenPage() {
    return (
        <main className="max-w-4xl mx-auto px-6 py-16">
            <h1 className="text-4xl font-bold mb-6">
                Best burgers in Boden
            </h1>

            <p className="mb-4">
                Nordic Eatery serves some of the best burgers in Boden. Our burgers are
                made with premium ingredients and cooked fresh to order.
            </p>

            <p className="mb-4">
                Try our loaded fries and signature street food menu. Available for
                takeaway and delivery.
            </p>
        </main>
    );
}