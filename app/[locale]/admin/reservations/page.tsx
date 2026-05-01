import { redirect } from "next/navigation";
import {
    CalendarCheck,
    CalendarClock,
    CheckCircle2,
    Clock,
    Mail,
    Phone,
    UsersRound,
    XCircle
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { ReservationActions } from "@/components/admin/ReservationActions";
import { createClient } from "@/lib/supabase/server";
import { canManageReservations } from "@/lib/auth/roles";

type ReservationsPageProps = {
    params: Promise<{
        locale: string;
    }>;
};

type ReservationStatus = "pending" | "confirmed" | "cancelled" | "completed";

type ReservationRow = {
    id: string;
    customer_name: string;
    customer_phone: string | null;
    customer_email: string | null;
    reservation_date: string;
    reservation_time: string;
    guests_count: number;
    status: ReservationStatus;
    note: string | null;
    created_at: string;
};

function formatDate(date: string) {
    return new Intl.DateTimeFormat("sv-SE", {
        dateStyle: "medium"
    }).format(new Date(date));
}

function formatTime(time: string) {
    return time.slice(0, 5);
}

function getStatusClass(status: ReservationStatus) {
    switch (status) {
        case "pending":
            return "border-[#F6A21A]/25 bg-[#F6A21A]/15 text-[#A96800]";
        case "confirmed":
            return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700";
        case "completed":
            return "border-[#EADDCF] bg-[#FFF3E2] text-[#7B6A61]";
        case "cancelled":
            return "border-[#E51B23]/15 bg-[#E51B23]/8 text-[#C7192E]";
        default:
            return "border-[#EADDCF] bg-[#FFF3E2] text-[#7B6A61]";
    }
}

function StatCard({
                      title,
                      value,
                      description,
                      icon: Icon,
                      tone = "red"
                  }: {
    title: string;
    value: string;
    description: string;
    icon: React.ElementType;
    tone?: "red" | "green" | "gold" | "dark";
}) {
    const iconClass =
        tone === "green"
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
            : tone === "gold"
                ? "border-[#F6A21A]/25 bg-[#F6A21A]/15 text-[#A96800]"
                : tone === "dark"
                    ? "border-[#EADDCF] bg-[#FFF3E2] text-[#7B6A61]"
                    : "border-[#E51B23]/15 bg-[#E51B23]/8 text-[#C7192E]";

    return (
        <div className="relative overflow-hidden rounded-[1.75rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl">
            <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[#E51B23]/8 blur-2xl" />

            <div className="relative flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-black text-[#8A7A70]">{title}</p>
                    <h3 className="mt-3 text-3xl font-black tracking-[-0.055em] text-[#25120F]">
                        {value}
                    </h3>
                </div>

                <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${iconClass}`}
                >
                    <Icon className="h-5 w-5" />
                </div>
            </div>

            <p className="relative mt-4 text-xs font-medium text-[#7B6A61]">
                {description}
            </p>
        </div>
    );
}

export default async function ReservationsPage({
                                                   params
                                               }: ReservationsPageProps) {
    const { locale } = await params;

    const supabase = await createClient();

    const {
        data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/${locale}/login?next=/${locale}/admin/reservations`);
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!canManageReservations(profile?.role)) {
        redirect(`/${locale}/unauthorized`);
    }

    const { data: reservations, error } = await supabase
        .from("reservations")
        .select(
            "id, customer_name, customer_phone, customer_email, reservation_date, reservation_time, guests_count, status, note, created_at"
        )
        .order("reservation_date", { ascending: true })
        .order("reservation_time", { ascending: true });

    const reservationList = ((reservations || []) as ReservationRow[]) || [];

    const pendingCount = reservationList.filter(
        (reservation) => reservation.status === "pending"
    ).length;

    const confirmedCount = reservationList.filter(
        (reservation) => reservation.status === "confirmed"
    ).length;

    const completedCount = reservationList.filter(
        (reservation) => reservation.status === "completed"
    ).length;

    const cancelledCount = reservationList.filter(
        (reservation) => reservation.status === "cancelled"
    ).length;

    return (
        <AdminShell>
            <div className="space-y-6">
                <section className="relative overflow-hidden rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-2xl shadow-[#4C2314]/10 backdrop-blur-2xl lg:p-6">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(229,27,35,0.09),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(255,159,64,0.16),transparent_34%)]" />

                    <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-[#E51B23]/15 bg-[#E51B23]/8 px-3 py-1 text-xs font-black text-[#C7192E]">
                                <CalendarCheck className="h-3.5 w-3.5" />
                                Booking management
                            </div>

                            <h1 className="mt-4 text-4xl font-black tracking-[-0.055em] text-[#25120F] md:text-5xl">
                                Reservations
                            </h1>

                            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[#7B6A61]">
                                Manage customer bookings, guest count, confirmation status and
                                reservation notes.
                            </p>
                        </div>

                        <div className="flex h-12 items-center gap-2 rounded-2xl border border-[#EADDCF] bg-white/70 px-4 text-sm font-black text-[#7B6A61]">
                            <CalendarClock className="h-4 w-4 text-[#C7192E]" />
                            Reservation flow
                        </div>
                    </div>
                </section>

                {error ? (
                    <div className="rounded-[1.5rem] border border-[#E51B23]/15 bg-[#E51B23]/8 p-4 text-sm font-bold text-[#C7192E]">
                        {error.message}
                    </div>
                ) : null}

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        title="Pending"
                        value={String(pendingCount)}
                        description="Waiting for confirmation"
                        icon={Clock}
                        tone="gold"
                    />

                    <StatCard
                        title="Confirmed"
                        value={String(confirmedCount)}
                        description="Approved upcoming bookings"
                        icon={CheckCircle2}
                        tone="green"
                    />

                    <StatCard
                        title="Completed"
                        value={String(completedCount)}
                        description="Finished reservations"
                        icon={UsersRound}
                        tone="dark"
                    />

                    <StatCard
                        title="Cancelled"
                        value={String(cancelledCount)}
                        description="Cancelled bookings"
                        icon={XCircle}
                        tone="red"
                    />
                </section>

                <section className="overflow-hidden rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/88 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl">
                    <div className="flex flex-col gap-3 border-b border-[#EADDCF] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-xl font-black tracking-[-0.03em] text-[#25120F]">
                                All reservations
                            </h2>
                            <p className="mt-1 text-sm font-medium text-[#7B6A61]">
                                Bookings loaded from Supabase.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-[#EADDCF] bg-white/70 px-4 py-2 text-sm font-black text-[#7B6A61]">
                            {reservationList.length} reservations
                        </div>
                    </div>

                    {reservationList.length === 0 ? (
                        <div className="p-5">
                            <div className="rounded-[1.5rem] border border-dashed border-[#EADDCF] bg-white/60 p-8 text-center">
                                <CalendarCheck className="mx-auto h-10 w-10 text-[#C7192E]" />
                                <p className="mt-4 text-sm font-black text-[#25120F]">
                                    No reservations found
                                </p>
                                <p className="mt-2 text-sm font-medium text-[#7B6A61]">
                                    Customer bookings will appear here.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1080px] border-separate border-spacing-y-2 px-5 py-3 text-left">
                                <thead>
                                <tr className="text-xs uppercase tracking-[0.16em] text-[#A39388]">
                                    <th className="px-4 py-2 font-black">Customer</th>
                                    <th className="px-4 py-2 font-black">Contact</th>
                                    <th className="px-4 py-2 font-black">Date</th>
                                    <th className="px-4 py-2 font-black">Time</th>
                                    <th className="px-4 py-2 font-black">Guests</th>
                                    <th className="px-4 py-2 font-black">Status</th>
                                    <th className="px-4 py-2 font-black">Note</th>
                                    <th className="px-4 py-2 text-right font-black">Actions</th>
                                </tr>
                                </thead>

                                <tbody>
                                {reservationList.map((reservation) => (
                                    <tr key={reservation.id} className="group">
                                        <td className="rounded-l-2xl border-y border-l border-[#EADDCF] bg-white/70 px-4 py-4 group-hover:bg-[#FFF3E2]">
                                            <p className="text-sm font-black text-[#25120F]">
                                                {reservation.customer_name}
                                            </p>
                                            <p className="mt-1 max-w-[140px] truncate text-xs font-medium text-[#A39388]">
                                                {reservation.id}
                                            </p>
                                        </td>

                                        <td className="border-y border-[#EADDCF] bg-white/70 px-4 py-4 group-hover:bg-[#FFF3E2]">
                                            <div className="space-y-1">
                                                {reservation.customer_phone ? (
                                                    <div className="flex items-center gap-2 text-xs font-bold text-[#25120F]">
                                                        <Phone className="h-3.5 w-3.5 text-[#C7192E]" />
                                                        {reservation.customer_phone}
                                                    </div>
                                                ) : null}

                                                {reservation.customer_email ? (
                                                    <div className="flex items-center gap-2 text-xs font-bold text-[#7B6A61]">
                                                        <Mail className="h-3.5 w-3.5 text-[#C7192E]" />
                                                        {reservation.customer_email}
                                                    </div>
                                                ) : null}

                                                {!reservation.customer_phone &&
                                                !reservation.customer_email ? (
                                                    <span className="text-xs font-bold text-[#A39388]">
                              No contact
                            </span>
                                                ) : null}
                                            </div>
                                        </td>

                                        <td className="border-y border-[#EADDCF] bg-white/70 px-4 py-4 text-sm font-black text-[#25120F] group-hover:bg-[#FFF3E2]">
                                            {formatDate(reservation.reservation_date)}
                                        </td>

                                        <td className="border-y border-[#EADDCF] bg-white/70 px-4 py-4 text-sm font-black text-[#C7192E] group-hover:bg-[#FFF3E2]">
                                            {formatTime(reservation.reservation_time)}
                                        </td>

                                        <td className="border-y border-[#EADDCF] bg-white/70 px-4 py-4 group-hover:bg-[#FFF3E2]">
                        <span className="rounded-full border border-[#EADDCF] bg-[#FFF3E2] px-3 py-1 text-xs font-black text-[#7B6A61]">
                          {reservation.guests_count} guests
                        </span>
                                        </td>

                                        <td className="border-y border-[#EADDCF] bg-white/70 px-4 py-4 group-hover:bg-[#FFF3E2]">
                        <span
                            className={`rounded-full border px-3 py-1 text-xs font-black capitalize ${getStatusClass(
                                reservation.status
                            )}`}
                        >
                          {reservation.status}
                        </span>
                                        </td>

                                        <td className="border-y border-[#EADDCF] bg-white/70 px-4 py-4 group-hover:bg-[#FFF3E2]">
                                            <p className="max-w-[240px] truncate text-sm font-medium text-[#7B6A61]">
                                                {reservation.note || "—"}
                                            </p>
                                        </td>

                                        <td className="rounded-r-2xl border-y border-r border-[#EADDCF] bg-white/70 px-4 py-4 group-hover:bg-[#FFF3E2]">
                                            <ReservationActions
                                                reservationId={reservation.id}
                                                status={reservation.status}
                                            />
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </AdminShell>
    );
}