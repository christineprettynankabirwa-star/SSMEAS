import type { ReactNode } from "react";
import Card from "./Card";

interface Props { label: string; value: ReactNode; detail: string; icon: ReactNode; tone: string; line: string; }
export default function MetricCard({ label, value, detail, icon, tone, line }: Props) {
  return <Card className="relative flex h-full min-h-40 flex-col justify-between overflow-hidden p-5" interactive><span className={`absolute inset-y-5 left-0 w-1 rounded-r-full ${line} shadow-[0_0_18px_currentColor]`} /><div className="absolute -right-10 -top-10 size-28 rounded-full bg-cyan-400/5 blur-2xl"/><div className="flex items-start justify-between gap-3"><p className="text-[11px] font-bold uppercase tracking-[.11em] text-slate-400">{label}</p><span className={`grid size-11 shrink-0 place-items-center rounded-xl ring-1 ring-white/10 ${tone}`}>{icon}</span></div><div><p className="mt-5 text-4xl font-black tracking-tight text-white">{value}</p><p className="mt-1.5 text-xs text-slate-400">{detail}</p></div></Card>;
}
