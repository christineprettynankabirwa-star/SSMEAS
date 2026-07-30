"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getAnalytics } from "@/services/api";
import AnalyticsSummaryCards from "./AnalyticsSummaryCards";
import TelemetryChart from "./TelemetryChart";
import type { AnalyticsRange, AnalyticsResponse, Tank } from "./types";

const ranges: Array<{ value: AnalyticsRange; label: string }> = [{ value: "1h", label: "Last Hour" }, { value: "24h", label: "Last 24 Hours" }, { value: "7d", label: "Last 7 Days" }, { value: "30d", label: "Last 30 Days" }, { value: "all", label: "All Time" }];
const colors = ["#2563eb", "#0891b2", "#7c3aed", "#ea580c", "#16a34a", "#db2777", "#475569"];
const empty: AnalyticsResponse = { range: "24h", generatedAt: "", readings: [], summary: { highestFill: null, averageFill: null, highestGas: null, reportingDeviceCount: 0, offlineDeviceCount: 0 } };

export default function AnalyticsDashboard({ tanks, initialTankId, selectedTankIds, onSelectedTankIdsChange }: { tanks: Tank[]; initialTankId?: string; selectedTankIds?: string[]; onSelectedTankIdsChange?: (ids: string[]) => void }) {
  const [localSelected, setLocalSelected] = useState<string[]>(initialTankId ? [initialTankId] : []);
  const [range, setRange] = useState<AnalyticsRange>("24h");
  const [analytics, setAnalytics] = useState(empty);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = selectedTankIds ?? localSelected;
  const setSelected = onSelectedTankIdsChange ?? setLocalSelected;
  const effectiveSelected = useMemo(() => selected.length > 0 ? selected : initialTankId ? [initialTankId] : tanks[0] ? [tanks[0].id] : [], [initialTankId, selected, tanks]);
  const load = useCallback(async (force = false) => {
    if (effectiveSelected.length === 0) return;
    setLoading(true); setError(null);
    try { setAnalytics(await getAnalytics(effectiveSelected, range, force)); }
    catch { setError("Analytics are temporarily unavailable. Retrying automatically."); }
    finally { setLoading(false); }
  }, [effectiveSelected, range]);
  useEffect(() => { const initialId = window.setTimeout(() => void load(), 0); const id = window.setInterval(() => void load(true), 30_000); return () => { window.clearTimeout(initialId); window.clearInterval(id); }; }, [load]);

  const comparisonData = useMemo(() => {
    const byTime = new Map<string, { recorded_at: string } & Record<string, string | number | null>>();
    analytics.readings.forEach((item) => {
      const row = byTime.get(item.recorded_at) ?? { recorded_at: item.recorded_at };
      row[`${item.tank_id}:level`] = item.level;
      row[`${item.tank_id}:gas`] = item.gas_level;
      byTime.set(item.recorded_at, row);
    });
    return [...byTime.values()];
  }, [analytics.readings]);
  const selectedTanks = effectiveSelected.map((id) => tanks.find((tank) => tank.id === id)).filter((tank): tank is Tank => Boolean(tank));
  const toggleTank = (id: string) => setSelected(effectiveSelected.includes(id) ? (effectiveSelected.length === 1 ? effectiveSelected : effectiveSelected.filter((item) => item !== id)) : [...effectiveSelected.slice(0, 6), id]);
  const metricCharts = [{ key: "level", label: "Comparative sewage level", unit: "%", suffix: "level" }, { key: "gas_level", label: "Comparative gas level", unit: " ppm", suffix: "gas" }] as const;
  const calibrationWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (analytics.readings.some((reading) => reading.level !== null && (reading.level < 0 || reading.level > 100))) warnings.push("A level sensor reported outside its calibrated 0–100% range.");
    if (analytics.readings.some((reading) => reading.gas_level !== null && reading.gas_level < 0)) warnings.push("A gas sensor reported a negative value.");
    for (const tankId of effectiveSelected) {
      const recent = analytics.readings.filter((reading) => reading.tank_id === tankId && reading.level !== null).slice(-5);
      if (recent.length === 5 && recent.every((reading) => reading.level === recent[0]!.level)) {
        warnings.push(`${tanks.find((tank) => tank.id === tankId)?.tank_name ?? tankId} has five identical level readings; verify sensor calibration.`);
      }
    }
    return warnings;
  }, [analytics.readings, effectiveSelected, tanks]);

  return <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-white via-white to-blue-50/70 p-4 shadow-sm sm:p-6">
    <div className="flex flex-col gap-5 border-b border-blue-100 pb-6 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-blue-700">Network intelligence</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Historical analytics</h2><p className="mt-1 max-w-2xl text-sm text-slate-500">Explore sensor performance, compare tank trends, and drag the navigator beneath any chart to zoom or pan.</p></div><div className="flex flex-wrap gap-2" aria-label="Analytics time range">{ranges.map((item) => <button key={item.value} type="button" onClick={() => setRange(item.value)} className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${range === item.value ? "border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-200" : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50"}`}>{item.label}</button>)}</div></div>
    <div className="py-5"><div className="mb-3 flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Compare tanks — up to 7</p><div className="flex gap-2"><button type="button" onClick={() => setSelected(tanks.slice(0, 7).map(({ id }) => id))} className="text-xs font-bold text-cyan-700">Select first 7</button><button type="button" onClick={() => setSelected(tanks[0] ? [tanks[0].id] : [])} className="text-xs font-bold text-slate-600">Reset</button></div></div><div className="flex flex-wrap gap-2">{tanks.map((tank) => { const active = effectiveSelected.includes(tank.id); const disabled = !active && effectiveSelected.length >= 7; return <button key={tank.id} type="button" aria-pressed={active} disabled={disabled} title={disabled ? "A maximum of seven tanks can be compared." : undefined} onClick={() => toggleTank(tank.id)} className={`rounded-full border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${active ? "border-cyan-600 bg-cyan-600 text-white shadow-sm shadow-cyan-100" : "border-slate-200 bg-white text-slate-600 hover:border-cyan-200 hover:bg-cyan-50"}`}><span className={`mr-2 inline-block size-2 rounded-full ${active ? "bg-white" : "bg-slate-400"}`} />{tank.tank_name}</button>; })}</div></div>
    {error && <div role="alert" className="mb-4 rounded-xl border border-rose-800 bg-rose-950/60 px-4 py-3 text-sm text-rose-200">{error}</div>}
    {calibrationWarnings.length > 0 && <div role="alert" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"><p className="font-bold">Sensor calibration warning</p><ul className="mt-1 list-disc pl-5">{calibrationWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}
    <AnalyticsSummaryCards summary={analytics.summary} scopeLabel={effectiveSelected.length > 1 ? `Comparison group · ${effectiveSelected.length} tanks` : `Selected tank · ${selectedTanks[0]?.tank_name ?? "none"}`} />
    <div className={`mt-5 space-y-5 transition-opacity ${loading ? "opacity-60" : "opacity-100"}`} aria-busy={loading}>
      {comparisonData.length === 0 ? <div className="grid h-64 place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">No readings are available for this period.</div> : <div className="grid gap-5 lg:grid-cols-2">{metricCharts.map((metric) => <article key={metric.key} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5"><div className="mb-3 flex items-center justify-between"><div><h3 className="font-bold text-slate-900">{metric.label} ({metric.unit.trim()})</h3><p className="text-xs text-slate-500">{effectiveSelected.length > 1 ? `${effectiveSelected.length}-tank comparison · same colors identify tanks in both charts` : selectedTanks[0]?.tank_name}</p></div><span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Live refresh</span></div><TelemetryChart data={comparisonData} unit={metric.unit} yDomain={metric.key === "level" ? [0, 100] : [0, "auto"]} syncId="analytics-telemetry" series={selectedTanks.map((tank, index) => ({ key: `${tank.id}:${metric.suffix}`, name: tank.tank_name, color: colors[index % colors.length]! }))} /></article>)}</div>}
    </div>
    <p className="mt-4 text-right text-[11px] text-slate-500">Updated {analytics.generatedAt ? new Date(analytics.generatedAt).toLocaleTimeString("en-UG") : "—"} · every 30 seconds</p>
  </div>;
}
