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
  trend,
}: AdminStatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[#EADDCF] bg-[#FFFCF6]/88 p-3 shadow-sm shadow-[#4C2314]/8 backdrop-blur-2xl transition hover:-translate-y-0.5 hover:bg-white md:p-4">
      <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-[#E51B23]/8 blur-2xl transition group-hover:bg-[#E51B23]/12 md:-right-12 md:-top-12 md:h-32 md:w-32" />

      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-black leading-4 text-[#8A7A70] sm:text-xs">
            {title}
          </p>

          <h3 className="mt-2 text-2xl font-black tracking-[-0.055em] text-[#25120F] md:mt-2 md:text-2xl">
            {value}
          </h3>
        </div>

        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border border-[#E51B23]/15 bg-[#E51B23]/8 md:h-9 md:w-9">
          <Icon className="h-4 w-4 text-[#C7192E] " />
        </div>
      </div>

      <div className="relative mt-3 flex flex-col items-start gap-1.5 md:mt-3 md:flex-row md:items-center md:gap-2">
        {trend ? (
          <span className="rounded-full border border-[#E51B23]/15 bg-[#E51B23]/8 px-2 py-0.5 text-[10px] font-black text-[#C7192E] md:px-2 md:py-0.5 md:text-[10px]">
            {trend}
          </span>
        ) : null}

        <p className="break-words text-[11px] font-medium leading-4 text-[#7B6A61] md:text-[11px]">
          {description}
        </p>
      </div>
    </div>
  );
}
