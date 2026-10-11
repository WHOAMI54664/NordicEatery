"use client";

import { EditableCopy } from "@/components/site-content/EditableCopy";

import { useEffect, useState } from "react";

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
    const [order, setOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    async function fetchOrder() {
        try {
            const response = await fetch(
                `/api/orders/status/${encodeURIComponent(orderNumber)}`,
                {
                    method: "GET",
                    cache: "no-store",
                }
            );

            if (response.status === 404) {
                setOrder(null);
                setHasError(false);
                setIsLoading(false);
                return;
            }

            if (!response.ok) {
                throw new Error("Could not fetch order");
            }

            const data = (await response.json()) as { order: Order };

            setOrder(data.order);
            setHasError(false);
            setIsLoading(false);
        } catch (error) {
            console.error("Order status fetch error:", error);
            setHasError(true);
            setIsLoading(false);
        }
    }

    useEffect(() => {
        fetchOrder();

        const interval = window.setInterval(() => {
            fetchOrder();
        }, 5000);

        return () => {
            window.clearInterval(interval);
        };
    }, [orderNumber]);

    if (isLoading) {
        return (
            <main className="min-h-screen bg-cream px-6 py-24">
                <section className="mx-auto max-w-xl rounded-[2rem] bg-white p-8 shadow-xl">
                    <h1 className="text-3xl font-black text-dark"><EditableCopy value={"Loading order..."} textKey="screen.orderStatus.loading-order" page="orderStatus" /></h1>
                </section>
            </main>
        );
    }

    if (hasError) {
        return (
            <main className="min-h-screen bg-cream px-6 py-24">
                <section className="mx-auto max-w-xl rounded-[2rem] bg-white p-8 shadow-xl">
                    <h1 className="text-3xl font-black text-dark">
                        <EditableCopy value={"Could not load order"} textKey="screen.orderStatus.could-not-load-order" page="orderStatus" /></h1>

                    <p className="mt-3 text-dark/60">
                        <EditableCopy value={"Please refresh the page in a moment."} textKey="screen.orderStatus.please-refresh-the-page-in-a-moment" page="orderStatus" /></p>
                </section>
            </main>
        );
    }

    if (!order) {
        return (
            <main className="min-h-screen bg-cream px-6 py-24">
                <section className="mx-auto max-w-xl rounded-[2rem] bg-white p-8 shadow-xl">
                    <h1 className="text-3xl font-black text-dark"><EditableCopy value={"Order not found"} textKey="screen.orderStatus.order-not-found" page="orderStatus" /></h1>
                </section>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-cream px-6 py-24">
            <section className="mx-auto max-w-xl rounded-[2rem] border border-dark/10 bg-white p-8 shadow-xl">
                <h1 className="text-4xl font-black text-dark">
                    {statusText[order.status]}
                </h1>

                <p className="mt-4 text-dark/60">
                    <EditableCopy value={"Order ID:"} textKey="screen.orderStatus.order-id" page="orderStatus" />{" "}
                    <span className="font-bold text-dark">{order.order_number}</span>
                </p>

                <p className="mt-2 text-dark/60">
                    <EditableCopy value={"Payment:"} textKey="screen.orderStatus.payment" page="orderStatus" />{" "}
                    <span className="font-bold text-dark">
            {order.payment_method} · {order.payment_status}
          </span>
                </p>

                <p className="mt-2 text-dark/60">
                    <EditableCopy value={"Total:"} textKey="screen.orderStatus.total" page="orderStatus" />{" "}
                    <span className="font-bold text-paprika">
            {order.total_price} kr
          </span>
                </p>

                <div className="mt-8 space-y-4">
                    <StatusStep
                        active={order.status === "new"}
                        done
                        label="Order received"
                    />

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
                    <EditableCopy value={"This page updates automatically."} textKey="screen.orderStatus.this-page-updates-automatically" page="orderStatus" /></p>
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