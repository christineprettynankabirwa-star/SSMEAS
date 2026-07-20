import type { ReactNode } from "react";
import Card from "./Card";

interface Props { label: string; value: ReactNode; detail: string; icon: ReactNode; tone: string; line: string; }
export default function MetricCard({ label, value, detail, icon, tone, line }: Props) {
  return <Card className="relative flex h-full min-h-36 flex-col justify-between overflow-hidden p-4 sm:p-5" interactive><span className={`absolute inset-x-0 top-0 h-0.5 ${line}`} /><div className="flex items-start justify-between gap-3"><p className="text-[11px] font-bold uppercase tracking-[.08em] text-slate-500">{label}</p><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${tone}`}>{icon}</span></div><div><p className="mt-4 text-3xl font-black tracking-tight text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div></Card>;
}
