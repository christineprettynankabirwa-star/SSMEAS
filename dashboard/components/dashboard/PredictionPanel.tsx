import { useEffect, useState } from "react";
import type { OverflowPrediction } from "./types";

const riskStyles: Record<OverflowPrediction["risk"], { badge: string; bar: string; accent: string }> = {
  LOW: { badge: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-500", accent: "border-l-emerald-500" },
  MEDIUM: { badge: "bg-yellow-50 text-yellow-700", bar: "bg-yellow-400", accent: "border-l-yellow-400" },
  HIGH: { badge: "bg-orange-50 text-orange-700", bar: "bg-orange-500", accent: "border-l-orange-500" },
  CRITICAL: { badge: "bg-red-50 text-red-700", bar: "bg-red-600", accent: "border-l-red-600" },
};

const formatCountdown = (target: string | null, now: number): string => {
  if (!target) return "No active overflow trend";
  const remaining = Math.max(0, new Date(target).getTime() - now);
  if (remaining === 0) return "Overflow threshold reached";
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return `${days > 0 ? `${days}d ` : ""}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

export default function PredictionPanel({ prediction }: { prediction: OverflowPrediction | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 1_000); return () => window.clearInterval(id); }, []);
  const styles = prediction ? riskStyles[prediction.risk] : riskStyles.LOW;

  return <section className={`rounded-2xl border border-l-4 border-slate-200 bg-white p-5 shadow-sm ${styles.accent}`}>
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-blue-700">Predictive intelligence</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Overflow prediction</h2><p className="mt-1 text-sm text-slate-500">Forecast from historical PostgreSQL telemetry.</p></div>{prediction && <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${styles.badge}`}>{prediction.risk} RISK</span>}</div>
    {!prediction ? <p className="mt-6 text-sm text-slate-500">Select a reporting tank to generate a prediction.</p> : <div className="mt-5 space-y-5">
      <div className="rounded-xl bg-slate-950 p-4 text-white"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">Estimated time remaining</p><p className="mt-2 font-mono text-2xl font-bold tracking-tight">{formatCountdown(prediction.predictedOverflowAt, now)}</p><p className="mt-1 text-xs text-slate-400">{prediction.predictedOverflowAt ? `Expected ${new Date(prediction.predictedOverflowAt).toLocaleString()}` : "Level is stable or falling"}</p></div>
      <div><div className="flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Overflow risk</p><p className="mt-1 text-3xl font-bold text-slate-950">{prediction.riskPercentage}%</p></div><p className="text-right text-xs text-slate-500">Confidence<br/><strong className="text-slate-800">{prediction.confidence}%</strong></p></div><div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Overflow risk" aria-valuemin={0} aria-valuemax={100} aria-valuenow={prediction.riskPercentage}><div className={`h-full rounded-full transition-all duration-700 ${styles.bar}`} style={{ width: `${prediction.riskPercentage}%` }} /></div></div>
      <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current level</p><p className="mt-1 text-xl font-bold text-slate-950">{prediction.currentLevel == null ? "—" : `${prediction.currentLevel.toFixed(1)}%`}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fill trend</p><p className="mt-1 text-xl font-bold text-slate-950">{prediction.trendPercentPerHour.toFixed(2)}%/h</p></div></div>
      <div className="rounded-xl border border-cyan-100 bg-cyan-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-cyan-800">Recommended maintenance</p><p className="mt-1 text-sm font-bold text-slate-900">{prediction.recommendedMaintenanceAt ? new Date(prediction.recommendedMaintenanceAt).toLocaleString() : "Routine schedule — no urgent intervention"}</p></div>
      <p className="text-[11px] text-slate-500">Based on {prediction.samples} reading{prediction.samples === 1 ? "" : "s"}. Recalculated every 30 seconds.</p>
    </div>}
  </section>;
}
