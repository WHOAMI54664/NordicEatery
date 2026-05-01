"use client";

import { useState } from "react";
import { CheckCircle2, ChefHat, PackageCheck, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import type { OrderStatus } from "@/types/order";

type OrderStatusActionsProps = {
    orderId: string;
    status: OrderStatus;
};

export function OrderStatusActions({
                                       orderId,
                                       status
                                   }: OrderStatusActionsProps) {
    const supabase = createClient();
    const [isLoading, setIsLoading] = useState(false);

    async function updateStatus(nextStatus: OrderStatus) {
        setIsLoading(true);

        await supabase
            .from("orders")
            .update({
                status: nextStatus,
                updated_at: new Date().toISOString()
            })
            .eq("id", orderId);

        window.location.reload();
    }

    return (
        <div className="flex flex-wrap justify-end gap-2">
            {status === "new" ? (
                <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => updateStatus("preparing")}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-[#E51B23] px-4 text-xs font-black text-white shadow-lg shadow-[#E51B23]/15 transition hover:bg-[#C7192E] disabled:opacity-60"
                >
                    <ChefHat className="h-3.5 w-3.5" />
                    Start
                </button>
            ) : null}

            {status === "preparing" ? (
                <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => updateStatus("ready")}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-[#2A1712] px-4 text-xs font-black text-white transition hover:opacity-90 disabled:opacity-60"
                >
                    <PackageCheck className="h-3.5 w-3.5" />
                    Ready
                </button>
            ) : null}

            {status === "ready" ? (
                <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => updateStatus("completed")}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-xs font-black text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Complete
                </button>
            ) : null}

            {!["completed", "cancelled"].includes(status) ? (
                <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => updateStatus("cancelled")}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[#EADDCF] bg-white px-4 text-xs font-black text-[#7B6A61] transition hover:border-[#E51B23]/20 hover:bg-[#E51B23]/8 hover:text-[#C7192E] disabled:opacity-60"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                    Cancel
                </button>
            ) : null}
        </div>
    );
}