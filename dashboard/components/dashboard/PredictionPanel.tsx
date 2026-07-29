import type { OverflowPrediction, ThresholdProjection } from "./types";

const riskStyles: Record<OverflowPrediction["risk"], { badge: string; bar: string; accent: string }> = {
  UNKNOWN: { badge: "bg-slate-100 text-slate-700", bar: "bg-slate-400", accent: "border-l-slate-400" },
  LOW: { badge: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-500", accent: "border-l-emerald-500" },
  MODERATE: { badge: "bg-yellow-50 text-yellow-700", bar: "bg-yellow-400", accent: "border-l-yellow-400" },
  HIGH: { badge: "bg-orange-50 text-orange-700", bar: "bg-orange-500", accent: "border-l-orange-500" },
  CRITICAL: { badge: "bg-red-50 text-red-700", bar: "bg-red-600", accent: "border-l-red-600" },
};

const projectionText = (value: ThresholdProjection): string => {
  if (value.remainingHours === 0) return "Reached";
  if (value.remainingHours !== null) return `${value.remainingHours.toFixed(1)} h`;
  if (value.status === "STABLE_OR_FALLING") return "No rising trend";
  return "Insufficient data";
};

export default function PredictionPanel({ prediction }: { prediction: OverflowPrediction | null }) {
  const styles = prediction ? riskStyles[prediction.risk] : riskStyles.LOW;
  return <section className={`h-full rounded-2xl border border-l-4 border-slate-200 bg-white p-5 shadow-sm ${styles.accent}`}>
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">OLS statistical forecasting</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Predictive Analytics & Risk Engine</h2><p className="mt-1 text-sm text-slate-500">Timestamp-aware linear regression over historical PostgreSQL telemetry.</p></div>{prediction && <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${styles.badge}`}>{prediction.risk} RISK</span>}</div>
    {!prediction ? <p className="mt-6 text-sm text-slate-500">Select a reporting tank to calculate predictive analytics.</p> : <div className="mt-5 space-y-5">
      <div className="grid grid-cols-3 gap-2">{[
        ["Warning 65%", prediction.warningProjection],
        ["Danger 85%", prediction.dangerProjection],
        ["Overflow 100%", prediction.overflowProjection],
      ].map(([label, value]) => <div key={label as string} className="rounded-xl border border-cyan-200 bg-cyan-50 p-3"><p className="text-[10px] font-bold uppercase text-slate-500">{label as string}</p><p className="mt-2 text-sm font-black text-slate-950">{projectionText(value as ThresholdProjection)}</p><p className="mt-1 text-[10px] text-slate-500">{(value as ThresholdProjection).estimatedArrivalAt ? new Date((value as ThresholdProjection).estimatedArrivalAt!).toLocaleString() : (value as ThresholdProjection).status.replaceAll("_", " ")}</p></div>)}</div>
      <div className="flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Time-to-danger risk</p><p className="mt-1 text-3xl font-bold text-slate-950">{prediction.risk}</p></div><p className="text-right text-xs text-slate-500">Confidence<br/><strong className="text-slate-800">{prediction.confidence}%</strong></p></div>
      <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
        <div><p className="text-xs font-semibold uppercase text-slate-500">Current level / volume</p><p className="mt-1 text-xl font-bold">{prediction.currentLevel == null ? "—" : `${prediction.currentLevel.toFixed(1)}%`}</p><p className="text-xs text-slate-500">{prediction.currentVolumeCubicMeters == null ? "" : `${prediction.currentVolumeCubicMeters.toFixed(2)} m³`}</p></div>
        <div><p className="text-xs font-semibold uppercase text-slate-500">Fill velocity</p><p className="mt-1 text-xl font-bold">{prediction.fillVelocityPercentPerHour.toFixed(2)}%/h</p></div>
        <div><p className="text-xs font-semibold uppercase text-slate-500">Daily increase</p><p className="mt-1 text-xl font-bold">{prediction.historicalAverageDailyIncrease.toFixed(1)}%/day</p></div>
        <div><p className="text-xs font-semibold uppercase text-slate-500">Capacity remaining</p><p className="mt-1 text-xl font-bold">{prediction.remainingCapacityPercent == null ? "—" : `${prediction.remainingCapacityPercent.toFixed(1)}%`}</p><p className="text-xs text-slate-500">{prediction.remainingCapacityCubicMeters == null ? "" : `${prediction.remainingCapacityCubicMeters.toFixed(2)} m³`}</p></div>
      </div>
      <div className="rounded-xl border border-slate-200 p-3"><p className="text-xs font-semibold uppercase text-slate-600">Prediction quality</p><p className="mt-1 text-sm font-bold">{prediction.predictionQualityStatus.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-slate-500">{prediction.dataQualityIssues.length ? prediction.dataQualityIssues.map((issue) => issue.replaceAll("_", " ")).join(", ") : "No data-quality issues detected"}</p>{prediction.overflowProjection.predictionInterval95.minimumHours !== null && <p className="mt-2 text-xs text-slate-600">95% overflow interval: {prediction.overflowProjection.predictionInterval95.minimumHours.toFixed(1)}–{prediction.overflowProjection.predictionInterval95.maximumHours?.toFixed(1) ?? "unbounded"} hours</p>}</div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold uppercase text-slate-600">Recommended maintenance</p><p className="mt-1 text-sm font-bold">{prediction.recommendedMaintenanceAt ? new Date(prediction.recommendedMaintenanceAt).toLocaleString() : "Routine schedule — no urgent intervention"}</p></div>
      <p className="text-[11px] text-slate-500">Deterministic OLS result based on {prediction.samples} reading{prediction.samples === 1 ? "" : "s"}. No AI or machine learning is used.</p>
    </div>}
  </section>;
}
