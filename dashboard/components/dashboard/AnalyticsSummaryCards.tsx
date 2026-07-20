import type { AnalyticsSummary } from "./types";

const items: Array<{ key: keyof AnalyticsSummary; label: string; unit: string; tone: string }> = [
  { key: "highestFill", label: "Highest fill", unit: "%", tone: "bg-blue-50 text-blue-700" },
  { key: "averageFill", label: "Average fill", unit: "%", tone: "bg-cyan-50 text-cyan-700" },
  { key: "highestGas", label: "Highest gas", unit: " ppm", tone: "bg-amber-50 text-amber-700" },
  { key: "averageTemperature", label: "Avg. temperature", unit: "°C", tone: "bg-orange-50 text-orange-700" },
  { key: "latestBatteryVoltage", label: "Latest battery", unit: " V", tone: "bg-emerald-50 text-emerald-700" },
  { key: "reportingDeviceCount", label: "Reporting devices", unit: "", tone: "bg-indigo-50 text-indigo-700" },
  { key: "offlineDeviceCount", label: "Offline devices", unit: "", tone: "bg-rose-50 text-rose-700" },
];

export default function AnalyticsSummaryCards({ summary }: { summary: AnalyticsSummary }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">{items.map(({ key, label, unit, tone }) => {
    const value = summary[key];
    const formatted = value === null ? "—" : typeof value === "number" && !Number.isInteger(value) ? value.toFixed(1) : value;
    return <article key={key} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/60"><div className={`mb-3 grid size-8 place-items-center rounded-lg text-sm font-black ${tone}`} aria-hidden="true">●</div><p className="text-2xl font-bold tracking-tight text-slate-900">{formatted}{value !== null && unit}</p><p className="mt-1 text-xs font-semibold text-slate-500">{label}</p></article>;
  })}</div>;
}
