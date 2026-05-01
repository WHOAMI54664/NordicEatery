import { LucideIcon } from "lucide-react";

type AdminStatCardProps = {
    title: string;
    value: string;
    description: string;
    icon: LucideIcon;
    trend?: string;
};

export function AdminStatCard({
                                  title,
                                  value,
                                  description,
                                  icon: Icon,
                                  trend
                              }: AdminStatCardProps) {
    return (
        <div className="group relative overflow-hidden rounded-[1.75rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl transition hover:-translate-y-0.5 hover:bg-white">
            <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[#E51B23]/8 blur-2xl transition group-hover:bg-[#E51B23]/12" />

            <div className="relative flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-black text-[#8A7A70]">{title}</p>

                    <h3 className="mt-3 text-3xl font-black tracking-[-0.055em] text-[#25120F]">
                        {value}
                    </h3>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E51B23]/15 bg-[#E51B23]/8">
                    <Icon className="h-5 w-5 text-[#C7192E]" />
                </div>
            </div>

            <div className="relative mt-5 flex items-center gap-2">
                {trend ? (
                    <span className="rounded-full border border-[#E51B23]/15 bg-[#E51B23]/8 px-2.5 py-1 text-xs font-black text-[#C7192E]">
            {trend}
          </span>
                ) : null}

                <p className="text-xs font-medium text-[#7B6A61]">{description}</p>
            </div>
        </div>
    );
}