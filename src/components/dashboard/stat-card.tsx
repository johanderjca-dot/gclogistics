import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import type { Stat } from "@/lib/dashboard-data";

const TONE_STYLES: Record<Stat["tone"], { bg: string; fg: string; sub: string; chip: string }> = {
  dark: {
    bg: "bg-steel-950",
    fg: "text-white",
    sub: "text-steel-300",
    chip: "bg-white/10 text-white",
  },
  mid: {
    bg: "bg-steel-700",
    fg: "text-white",
    sub: "text-steel-200",
    chip: "bg-white/10 text-white",
  },
  base: {
    bg: "bg-steel-300",
    fg: "text-steel-950",
    sub: "text-steel-800/70",
    chip: "bg-steel-950/10 text-steel-900",
  },
  light: {
    bg: "bg-steel-100",
    fg: "text-steel-950",
    sub: "text-steel-600",
    chip: "bg-steel-950/8 text-steel-900",
  },
};

export function StatCard({ stat, icon: Icon }: { stat: Stat; icon: LucideIcon }) {
  const tone = TONE_STYLES[stat.tone];
  const positive = stat.trend >= 0;

  return (
    <div className={`rounded-3xl p-5 shadow-sm shadow-steel-900/5 ${tone.bg}`}>
      <div className="flex items-center justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone.chip}`}
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        </div>
      </div>

      <p className={`mt-5 text-sm font-medium ${tone.sub}`}>{stat.label}</p>
      <p className={`font-display mt-1 text-3xl font-bold tracking-tight ${tone.fg}`}>
        {stat.value}
      </p>

      <div className="mt-3 flex items-center gap-1.5">
        <span
          className={`flex items-center gap-0.5 text-xs font-semibold ${tone.fg}`}
        >
          {positive ? (
            <ArrowUpRight className="h-3.5 w-3.5" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5" />
          )}
          {Math.abs(stat.trend)}%
        </span>
        <span className={`text-xs ${tone.sub}`}>{stat.helper}</span>
      </div>
    </div>
  );
}
