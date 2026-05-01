"use client";

import { useState } from "react";
import { CheckCircle2, Clock, Trash2, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

type ReservationStatus = "pending" | "confirmed" | "cancelled" | "completed";

type ReservationActionsProps = {
    reservationId: string;
    status: ReservationStatus;
};

export function ReservationActions({
                                       reservationId,
                                       status
                                   }: ReservationActionsProps) {
    const supabase = createClient();
    const [isLoading, setIsLoading] = useState(false);

    async function updateStatus(nextStatus: ReservationStatus) {
        setIsLoading(true);

        await supabase
            .from("reservations")
            .update({
                status: nextStatus,
                updated_at: new Date().toISOString()
            })
            .eq("id", reservationId);

        window.location.reload();
    }

    return (
        <div className="flex flex-wrap justify-end gap-2">
            {status === "pending" ? (
                <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => updateStatus("confirmed")}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-[#E51B23] px-4 text-xs font-black text-white shadow-lg shadow-[#E51B23]/15 transition hover:bg-[#C7192E] disabled:opacity-60"
                >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Confirm
                </button>
            ) : null}

            {status === "confirmed" ? (
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

            {status === "cancelled" || status === "completed" ? null : (
                <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => updateStatus("cancelled")}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[#E51B23]/15 bg-[#E51B23]/8 px-4 text-xs font-black text-[#C7192E] transition hover:bg-[#E51B23]/12 disabled:opacity-60"
                >
                    <XCircle className="h-3.5 w-3.5" />
                    Cancel
                </button>
            )}

            {status === "cancelled" ? (
                <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => updateStatus("pending")}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[#EADDCF] bg-white px-4 text-xs font-black text-[#7B6A61] transition hover:border-[#E51B23]/20 hover:text-[#C7192E] disabled:opacity-60"
                >
                    <Clock className="h-3.5 w-3.5" />
                    Restore
                </button>
            ) : null}
        </div>
    );
}