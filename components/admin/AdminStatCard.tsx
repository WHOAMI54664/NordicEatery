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
        <div className="group relative overflow-hidden rounded-[1.5rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-4 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl transition hover:-translate-y-0.5 hover:bg-white md:rounded-[1.75rem] md:p-5">
            <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-[#E51B23]/8 blur-2xl transition group-hover:bg-[#E51B23]/12 md:-right-12 md:-top-12 md:h-32 md:w-32" />

            <div className="relative flex items-start justify-between gap-2 md:gap-4">
                <div className="min-w-0">
                    <p className="text-[11px] font-black leading-4 text-[#8A7A70] sm:text-sm">
                        {title}
                    </p>

                    <h3 className="mt-2 text-2xl font-black tracking-[-0.055em] text-[#25120F] md:mt-3 md:text-3xl">
                        {value}
                    </h3>
                </div>

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[#E51B23]/15 bg-[#E51B23]/8 md:h-11 md:w-11">
                    <Icon className="h-4 w-4 text-[#C7192E] md:h-5 md:w-5" />
                </div>
            </div>

            <div className="relative mt-3 flex flex-col items-start gap-1.5 md:mt-5 md:flex-row md:items-center md:gap-2">
                {trend ? (
                    <span className="rounded-full border border-[#E51B23]/15 bg-[#E51B23]/8 px-2 py-0.5 text-[10px] font-black text-[#C7192E] md:px-2.5 md:py-1 md:text-xs">
                        {trend}
                    </span>
                ) : null}

                <p className="line-clamp-2 text-[11px] font-medium leading-4 text-[#7B6A61] md:text-xs">
                    {description}
                </p>
            </div>
        </div>
    );
}