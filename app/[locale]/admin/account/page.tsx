import Image from "next/image";
import { redirect } from "next/navigation";
import {
    BadgeCheck,
    ChefHat,
    ClipboardList,
    LayoutDashboard,
    Mail,
    ShieldCheck,
    UserCog,
    UserRound
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { createClient } from "@/lib/supabase/server";
import { canAccessKitchen } from "@/lib/auth/roles";
import { AccountSignOutButton } from "@/components/admin/AccountSignOutButton";
import { AccountProfileForm } from "@/components/admin/AccountProfileForm";

type AccountPageProps = {
    params: Promise<{
        locale: string;
    }>;
};

type ProfileRow = {
    id: string;
    email: string | null;
    full_name: string | null;
    avatar_url: string | null;
    role: string | null;
    created_at?: string | null;
};

function formatDate(date?: string | null) {
    if (!date) return "Not available";

    return new Intl.DateTimeFormat("sv-SE", {
        dateStyle: "medium",
        timeStyle: "short"
    }).format(new Date(date));
}

function getRoleLabel(role?: string | null) {
    if (!role) return "Staff";

    return role.charAt(0).toUpperCase() + role.slice(1);
}

function PermissionCard({
                            icon: Icon,
                            title,
                            description,
                            enabled
                        }: {
    icon: React.ElementType;
    title: string;
    description: string;
    enabled: boolean;
}) {
    return (
        <div
            className={`rounded-[1.5rem] border p-4 ${
                enabled
                    ? "border-emerald-500/20 bg-emerald-500/10"
                    : "border-[#EADDCF] bg-white/70"
            }`}
        >
            <div className="flex items-start gap-3">
                <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
                        enabled
                            ? "border-emerald-500/20 bg-white/70 text-emerald-700"
                            : "border-[#EADDCF] bg-[#FFF3E2] text-[#7B6A61]"
                    }`}
                >
                    <Icon className="h-4 w-4" />
                </div>

                <div>
                    <p className="text-sm font-black text-[#25120F]">{title}</p>
                    <p className="mt-1 text-xs font-medium leading-5 text-[#7B6A61]">
                        {description}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default async function AdminAccountPage({ params }: AccountPageProps) {
    const { locale } = await params;

    const supabase = await createClient();

    const {
        data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/${locale}/login?next=/${locale}/admin/account`);
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url, role, created_at")
        .eq("id", user.id)
        .single();

    if (!canAccessKitchen(profile?.role)) {
        redirect(`/${locale}/unauthorized`);
    }

    const account = (profile || {
        id: user.id,
        email: user.email || null,
        full_name: null,
        avatar_url: null,
        role: "staff",
        created_at: user.created_at
    }) as ProfileRow;

    const normalizedRole = account.role?.toLowerCase();

    const isOwner = normalizedRole === "owner";
    const isAdmin = normalizedRole === "admin";
    const isCook = normalizedRole === "cook";

    return (
        <AdminShell>
            <div className="space-y-6">
                <section className="relative overflow-hidden rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-2xl shadow-[#4C2314]/10 backdrop-blur-2xl lg:p-6">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(229,27,35,0.09),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(255,159,64,0.16),transparent_34%)]" />

                    <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-[#E51B23]/15 bg-[#E51B23]/8 px-3 py-1 text-xs font-black text-[#C7192E]">
                                <UserCog className="h-3.5 w-3.5" />
                                Account settings
                            </div>

                            <h1 className="mt-4 text-4xl font-black tracking-[-0.055em] text-[#25120F] md:text-5xl">
                                My account
                            </h1>

                            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[#7B6A61]">
                                View your staff profile, role permissions and account access.
                            </p>
                        </div>

                        <div className="flex h-12 items-center gap-2 rounded-2xl border border-[#EADDCF] bg-white/70 px-4 text-sm font-black text-[#7B6A61]">
                            <ShieldCheck className="h-4 w-4 text-[#C7192E]" />
                            {getRoleLabel(account.role)}
                        </div>
                    </div>
                </section>

                <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
                    <aside className="rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl lg:p-6">
                        <div className="relative h-20 w-20 overflow-hidden rounded-[1.5rem] border border-[#E51B23]/15 bg-[#E51B23]/8">
                            {account.avatar_url ? (
                                <Image
                                    src={account.avatar_url}
                                    alt={account.full_name || "Profile photo"}
                                    fill
                                    sizes="80px"
                                    className="object-cover"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                    <UserRound className="h-8 w-8 text-[#C7192E]" />
                                </div>
                            )}
                        </div>

                        <h2 className="mt-5 text-3xl font-black tracking-[-0.055em] text-[#25120F]">
                            {account.full_name || "Staff member"}
                        </h2>

                        <p className="mt-2 text-sm font-medium text-[#7B6A61]">
                            {account.email || user.email || "No email"}
                        </p>

                        <div className="mt-5 inline-flex rounded-full border border-[#E51B23]/15 bg-[#E51B23]/8 px-3 py-1 text-xs font-black capitalize text-[#C7192E]">
                            {account.role || "staff"}
                        </div>

                        <div className="mt-6 space-y-3">
                            <div className="rounded-2xl border border-[#EADDCF] bg-white/70 p-4">
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#A39388]">
                                    User ID
                                </p>
                                <p className="mt-2 break-all text-sm font-black text-[#25120F]">
                                    {account.id}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-[#EADDCF] bg-white/70 p-4">
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#A39388]">
                                    Created
                                </p>
                                <p className="mt-2 text-sm font-black text-[#25120F]">
                                    {formatDate(account.created_at || user.created_at)}
                                </p>
                            </div>
                        </div>

                        <div className="mt-6">
                            <AccountSignOutButton locale={locale} />
                        </div>
                    </aside>

                    <section className="rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl lg:p-6">
                        <div className="mb-6 border-b border-[#EADDCF] pb-5">
                            <h2 className="text-xl font-black tracking-[-0.03em] text-[#25120F]">
                                Access permissions
                            </h2>
                            <p className="mt-1 text-sm font-medium text-[#7B6A61]">
                                Permissions are based on your current staff role.
                            </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <PermissionCard
                                icon={LayoutDashboard}
                                title="Dashboard"
                                description="Access the main CRM overview."
                                enabled={isOwner || isAdmin}
                            />

                            <PermissionCard
                                icon={ClipboardList}
                                title="Orders"
                                description="View and manage customer orders."
                                enabled={isOwner || isAdmin}
                            />

                            <PermissionCard
                                icon={ChefHat}
                                title="Kitchen display"
                                description="Access the kitchen order board."
                                enabled={isOwner || isAdmin || isCook}
                            />

                            <PermissionCard
                                icon={BadgeCheck}
                                title="Staff management"
                                description="Invite staff and update roles."
                                enabled={isOwner}
                            />

                            <PermissionCard
                                icon={ShieldCheck}
                                title="Settings"
                                description="Manage business and restaurant settings."
                                enabled={isOwner || isAdmin}
                            />

                            <PermissionCard
                                icon={Mail}
                                title="Account email"
                                description={account.email || user.email || "No email available"}
                                enabled={true}
                            />
                        </div>
                    </section>
                </section>

                <AccountProfileForm
                    userId={account.id}
                    initialFullName={account.full_name}
                    initialAvatarUrl={account.avatar_url}
                />
            </div>
        </AdminShell>
    );
}
