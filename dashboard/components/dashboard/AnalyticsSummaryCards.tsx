import { classifyGas, classifyLevel, type TankCondition } from "@/services/alert-thresholds";
import type { AnalyticsSummary } from "./types";

const items: Array<{ key: keyof AnalyticsSummary; label: string; unit: string }> = [
  { key: "highestFill", label: "Highest fill", unit: "%" },
  { key: "averageFill", label: "Average fill", unit: "%" },
  { key: "highestGas", label: "Highest gas", unit: " ppm" },
  { key: "reportingDeviceCount", label: "Reporting devices", unit: "" },
  { key: "offlineDeviceCount", label: "Offline devices", unit: "" },
];

const styles: Record<TankCondition, { card: string; dot: string; value: string; label: string }> = {
  SAFE: { card: "border-emerald-300 bg-emerald-50/70", dot: "bg-emerald-600", value: "text-emerald-800", label: "Safe" },
  WARNING: { card: "border-amber-300 bg-amber-50/70", dot: "bg-amber-500", value: "text-amber-700", label: "Under warning" },
  DANGER: { card: "border-red-300 bg-red-50/70", dot: "bg-red-500", value: "text-red-700", label: "Danger" },
  OFFLINE: { card: "border-slate-300 bg-slate-50", dot: "bg-slate-400", value: "text-slate-700", label: "Offline / not reporting" },
};

const metricCondition = (
  key: keyof AnalyticsSummary,
  value: number | null,
  selectedCount: number,
): TankCondition => {
  if (value === null) return "OFFLINE";
  if (key === "highestFill" || key === "averageFill") return classifyLevel(value);
  if (key === "highestGas") return classifyGas(value);
  if (key === "reportingDeviceCount") {
    return value === 0 ? "DANGER" : value < selectedCount ? "WARNING" : "SAFE";
  }
  return value === 0 ? "SAFE" : value < selectedCount ? "WARNING" : "DANGER";
};

export default function AnalyticsSummaryCards({
  summary,
  scopeLabel,
  selectedCount,
}: {
  summary: AnalyticsSummary;
  scopeLabel: string;
  selectedCount: number;
}) {
  return <>
    <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {items.map(({ key, label, unit }) => {
        const value = summary[key];
        const formatted = value === null ? "—" : typeof value === "number" && !Number.isInteger(value) ? value.toFixed(1) : value;
        const condition = metricCondition(key, value, selectedCount);
        const style = styles[condition];
        return <article
          key={key}
          aria-label={`${label}: ${formatted}${value !== null ? unit : ""}. Status: ${style.label}. ${scopeLabel}.`}
          className={`relative flex min-h-32 flex-col justify-between overflow-hidden rounded-xl border p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${style.card}`}
        >
          <span className={`absolute inset-x-0 top-0 h-1 ${style.dot}`} aria-hidden="true"/>
          <div className={`size-2.5 rounded-full ${style.dot}`} title={style.label} aria-hidden="true"/>
          <div>
            <p className={`text-2xl font-bold tracking-tight ${style.value}`}>{formatted}{value !== null && unit}</p>
            <p className="mt-1 text-xs font-semibold text-slate-700">{label}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">{scopeLabel}</p>
          </div>
        </article>;
      })}
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-semibold text-slate-600" aria-label="Summary status legend">
      <span className="font-bold uppercase tracking-wide text-slate-500">Status</span>
      {(["SAFE", "WARNING", "DANGER", "OFFLINE"] as const).map((condition) =>
        <span key={condition} className="inline-flex items-center gap-1.5">
          <span className={`size-2.5 rounded-full ${styles[condition].dot}`} aria-hidden="true"/>
          {styles[condition].label}
        </span>)}
    </div>
  </>;
}
