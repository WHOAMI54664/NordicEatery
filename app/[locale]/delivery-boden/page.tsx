import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Food delivery in Boden | Nordic Eatery",
    description:
        "Fast food delivery in Boden. Order burgers, fries and street food with delivery in 30–40 minutes.",
};

export default function DeliveryBodenPage() {
    return (
        <main className="max-w-4xl mx-auto px-6 py-16">
            <h1 className="text-4xl font-bold mb-6">
                Food delivery in Boden
            </h1>

            <p className="mb-4">
                Looking for food delivery in Boden? Nordic Eatery offers fresh burgers,
                crispy fries and street food with fast delivery in 30–40 minutes.
            </p>

            <p className="mb-4">
                We prepare every order fresh using high-quality ingredients. Order online
                and enjoy fast takeaway or delivery anywhere in Boden.
            </p>

            <ul className="list-disc pl-6 mt-6 space-y-2">
                <li>Fast delivery (30–40 min)</li>
                <li>Fresh ingredients</li>
                <li>Popular burgers and street food</li>
                <li>Easy online ordering</li>
            </ul>
        </main>
    );
}