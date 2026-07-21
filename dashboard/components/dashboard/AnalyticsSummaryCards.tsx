import type { AnalyticsSummary } from "./types";

const items: Array<{ key: keyof AnalyticsSummary; label: string; unit: string; card: string; dot: string; value: string }> = [
  { key: "highestFill", label: "Highest fill", unit: "%", card: "border-blue-200 bg-blue-50/80", dot: "bg-blue-500", value: "text-blue-950" },
  { key: "averageFill", label: "Average fill", unit: "%", card: "border-cyan-200 bg-cyan-50/80", dot: "bg-cyan-500", value: "text-cyan-950" },
  { key: "highestGas", label: "Highest gas", unit: " ppm", card: "border-amber-200 bg-amber-50/80", dot: "bg-amber-500", value: "text-amber-950" },
  { key: "reportingDeviceCount", label: "Reporting devices", unit: "", card: "border-emerald-200 bg-emerald-50/80", dot: "bg-emerald-500", value: "text-emerald-950" },
  { key: "offlineDeviceCount", label: "Offline devices", unit: "", card: "border-rose-200 bg-rose-50/80", dot: "bg-rose-500", value: "text-rose-950" },
];

export default function AnalyticsSummaryCards({ summary }: { summary: AnalyticsSummary }) {
  return <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-5">{items.map(({ key, label, unit, card, dot, value: valueTone }) => {
    const value = summary[key];
    const formatted = value === null ? "—" : typeof value === "number" && !Number.isInteger(value) ? value.toFixed(1) : value;
    return <article key={key} className={`relative flex min-h-32 flex-col justify-between overflow-hidden rounded-xl border p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${card}`}><span className={`absolute inset-x-0 top-0 h-1 ${dot}`} aria-hidden="true"/><div className={`size-2.5 rounded-full ${dot}`} aria-hidden="true"/><div><p className={`text-2xl font-bold tracking-tight ${valueTone}`}>{formatted}{value !== null && unit}</p><p className="mt-1 text-xs font-semibold text-slate-600">{label}</p></div></article>;
  })}</div>;
}
