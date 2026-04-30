"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type OrderStatus = "new" | "preparing" | "ready" | "completed" | "cancelled";

type Order = {
    id: string;
    order_number: string;
    status: OrderStatus;
    payment_status: string;
    payment_method: string;
    total_price: number;
};

const statusText: Record<OrderStatus, string> = {
    new: "Order received",
    preparing: "Preparing your food",
    ready: "Ready for pickup",
    completed: "Completed",
    cancelled: "Cancelled",
};

export function OrderStatusTracker({ orderNumber }: { orderNumber: string }) {
    const supabase = useMemo(() => createClient(), []);

    const [order, setOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    async function fetchOrder() {
        const { data } = await supabase
            .from("orders")
            .select("id, order_number, status, payment_status, payment_method, total_price")
            .eq("order_number", orderNumber)
            .single();

        setOrder(data as Order | null);
        setIsLoading(false);
    }

    useEffect(() => {
        fetchOrder();

        const channel = supabase
            .channel(`order-${orderNumber}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "orders",
                    filter: `order_number=eq.${orderNumber}`,
                },
                (payload) => {
                    setOrder(payload.new as Order);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [orderNumber]);

    if (isLoading) {
        return (
            <main className="min-h-screen bg-cream px-6 py-24">
                <section className="mx-auto max-w-xl rounded-[2rem] bg-white p-8 shadow-xl">
                    <h1 className="text-3xl font-black text-dark">Loading order...</h1>
                </section>
            </main>
        );
    }

    if (!order) {
        return (
            <main className="min-h-screen bg-cream px-6 py-24">
                <section className="mx-auto max-w-xl rounded-[2rem] bg-white p-8 shadow-xl">
                    <h1 className="text-3xl font-black text-dark">Order not found</h1>
                </section>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-cream px-6 py-24">
            <section className="mx-auto max-w-xl rounded-[2rem] border border-dark/10 bg-white p-8 shadow-xl">
                <p className="text-sm font-black uppercase tracking-[0.2em] text-paprika">
                    Order status
                </p>

                <h1 className="mt-4 text-4xl font-black text-dark">
                    {statusText[order.status]}
                </h1>

                <p className="mt-4 text-dark/60">
                    Order ID:{" "}
                    <span className="font-bold text-dark">{order.order_number}</span>
                </p>

                <p className="mt-2 text-dark/60">
                    Payment:{" "}
                    <span className="font-bold text-dark">
            {order.payment_method} · {order.payment_status}
          </span>
                </p>

                <p className="mt-2 text-dark/60">
                    Total:{" "}
                    <span className="font-bold text-paprika">{order.total_price} kr</span>
                </p>

                <div className="mt-8 space-y-4">
                    <StatusStep active={order.status === "new"} done label="Order received" />

                    <StatusStep
                        active={order.status === "preparing"}
                        done={["preparing", "ready", "completed"].includes(order.status)}
                        label="Preparing"
                    />

                    <StatusStep
                        active={order.status === "ready"}
                        done={["ready", "completed"].includes(order.status)}
                        label="Ready"
                    />

                    <StatusStep
                        active={order.status === "completed"}
                        done={order.status === "completed"}
                        label="Completed"
                    />
                </div>

                <p className="mt-8 text-sm text-dark/50">
                    This page updates automatically.
                </p>
            </section>
        </main>
    );
}

function StatusStep({
                        label,
                        active,
                        done,
                    }: {
    label: string;
    active: boolean;
    done: boolean;
}) {
    return (
        <div
            className={`flex items-center gap-4 rounded-2xl border px-4 py-4 ${
                done ? "border-paprika/30 bg-paprika/10" : "border-dark/10 bg-dark/5"
            }`}
        >
            <div
                className={`h-4 w-4 rounded-full ${
                    active
                        ? "animate-pulse bg-paprika"
                        : done
                            ? "bg-paprika"
                            : "bg-dark/20"
                }`}
            />

            <span className="font-bold text-dark">{label}</span>
        </div>
    );
}