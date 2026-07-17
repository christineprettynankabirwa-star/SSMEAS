import type { OverflowPrediction } from "./types";

const riskStyles: Record<OverflowPrediction["risk"], string> = {
  LOW: "bg-emerald-50 text-emerald-700", MEDIUM: "bg-amber-50 text-amber-700",
  HIGH: "bg-orange-50 text-orange-700", CRITICAL: "bg-red-50 text-red-700",
};

export default function PredictionPanel({ prediction }: { prediction: OverflowPrediction | null }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-900">AI overflow prediction</h2><p className="mt-1 text-sm text-slate-500">Trend-based forecast from recent telemetry.</p></div>{prediction && <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${riskStyles[prediction.risk]}`}>{prediction.risk} RISK</span>}</div>
    {!prediction ? <p className="mt-6 text-sm text-slate-500">Select a reporting tank to generate a prediction.</p> : <div className="mt-5 grid gap-4 sm:grid-cols-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current level</p><p className="mt-1 text-2xl font-bold text-slate-950">{prediction.currentLevel == null ? "—" : `${prediction.currentLevel.toFixed(1)}%`}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fill trend</p><p className="mt-1 text-2xl font-bold text-slate-950">{prediction.trendPercentPerHour.toFixed(2)}%/h</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Overflow estimate</p><p className="mt-1 text-sm font-bold text-slate-950">{prediction.predictedOverflowAt ? new Date(prediction.predictedOverflowAt).toLocaleString() : "No rising overflow trend"}</p></div><p className="text-xs text-slate-500 sm:col-span-3">Confidence {prediction.confidence}% from {prediction.samples} reading{prediction.samples === 1 ? "" : "s"}.</p></div>}
  </section>;
}
