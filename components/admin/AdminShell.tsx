import { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

type AdminShellProps = {
    children: ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
    return (
        <div className="min-h-screen bg-[#FFF7EA] text-[#25120F]">
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(229,27,35,0.10),transparent_34%),radial-gradient(circle_at_top_right,rgba(255,159,64,0.14),transparent_34%),linear-gradient(180deg,#FFF7EA_0%,#FFF1DF_45%,#FFF8EF_100%)]" />
                <div className="absolute -left-40 top-0 h-[520px] w-[520px] rounded-full bg-[#E51B23]/10 blur-[150px]" />
                <div className="absolute right-[-160px] top-24 h-[520px] w-[520px] rounded-full bg-[#FF9F40]/18 blur-[150px]" />
                <div className="absolute bottom-[-180px] left-[34%] h-[420px] w-[420px] rounded-full bg-[#F7C873]/16 blur-[140px]" />
            </div>

            <div className="relative flex min-h-screen">
                <AdminSidebar />

                <main className="min-w-0 flex-1 px-4 py-4 lg:px-6 lg:py-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
