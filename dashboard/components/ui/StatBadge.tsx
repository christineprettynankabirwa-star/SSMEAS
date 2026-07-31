import type { ReactNode } from "react";

const tones = {
  safe: "border-emerald-400/25 bg-emerald-400/10 text-emerald-700 shadow-[0_0_16px_rgb(52_211_153/.08)]",
  warning: "border-amber-400/25 bg-amber-400/10 text-amber-700 shadow-[0_0_16px_rgb(251_191_36/.08)]",
  danger: "border-rose-400/25 bg-rose-400/10 text-rose-700 shadow-[0_0_16px_rgb(251_113_133/.1)]",
  info: "border-cyan-400/25 bg-cyan-400/10 text-cyan-700 shadow-[0_0_16px_rgb(34_211_238/.08)]",
  neutral: "border-slate-400/20 bg-slate-400/10 text-slate-600",
} as const;

export default function StatBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: keyof typeof tones }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${tones[tone]}`}><span className="size-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]"/>{children}</span>;
}
