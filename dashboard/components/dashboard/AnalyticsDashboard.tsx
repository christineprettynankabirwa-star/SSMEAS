"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { deduplicateTanks, getAnalytics, getLatestReadings } from "@/services/api";
import { classifyReading, type TankCondition } from "@/services/alert-thresholds";
import AnalyticsSummaryCards from "./AnalyticsSummaryCards";
import TelemetryChart from "./TelemetryChart";
import type { AnalyticsRange, AnalyticsResponse, SensorReading, Tank } from "./types";

const ranges: Array<{ value: AnalyticsRange; label: string }> = [{ value: "1h", label: "Last Hour" }, { value: "24h", label: "Last 24 Hours" }, { value: "7d", label: "Last 7 Days" }, { value: "30d", label: "Last 30 Days" }, { value: "all", label: "All Time" }];
const colors = ["#2563eb", "#0891b2", "#7c3aed", "#ea580c", "#16a34a", "#db2777", "#475569"];
const conditionDots: Record<TankCondition, string> = { SAFE: "bg-emerald-500", WARNING: "bg-amber-500", DANGER: "bg-red-500", OFFLINE: "bg-slate-400" };
const conditionLabels: Record<TankCondition, string> = { SAFE: "Live / reporting", WARNING: "Under warning", DANGER: "Danger", OFFLINE: "Offline / not reporting" };
const empty: AnalyticsResponse = { range: "24h", generatedAt: "", readings: [], summary: { highestFill: null, averageFill: null, highestGas: null, reportingDeviceCount: 0, offlineDeviceCount: 0 } };

export default function AnalyticsDashboard({ tanks, initialTankId, selectedTankIds, onSelectedTankIdsChange }: { tanks: Tank[]; initialTankId?: string; selectedTankIds?: string[]; onSelectedTankIdsChange?: (ids: string[]) => void }) {
  const [localSelected, setLocalSelected] = useState<string[]>(initialTankId ? [initialTankId] : []);
  const [range, setRange] = useState<AnalyticsRange>("24h");
  const [analytics, setAnalytics] = useState(empty);
  const [latestReadings, setLatestReadings] = useState<SensorReading[]>([]);
  const [latestCheckedAt, setLatestCheckedAt] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The API already deduplicates names, but keep this local protection for
  // cached, local, or independently supplied tank arrays.
  const uniqueTanks = useMemo(() => deduplicateTanks(tanks), [tanks]);

  const selected = selectedTankIds ?? localSelected;
  const setSelected = onSelectedTankIdsChange ?? setLocalSelected;
  const effectiveSelected = useMemo(() => {
    const availableIds = new Set(uniqueTanks.map(({ id }) => id));
    const retained = selected.filter((id) => availableIds.has(id));
    if (retained.length) return retained;
    if (initialTankId && availableIds.has(initialTankId)) return [initialTankId];
    return uniqueTanks[0] ? [uniqueTanks[0].id] : [];
  }, [initialTankId, selected, uniqueTanks]);
  const load = useCallback(async (force = false) => {
    if (effectiveSelected.length === 0) return;
    setLoading(true); setError(null);
    try {
      const [nextAnalytics, nextLatest] = await Promise.all([
        getAnalytics(effectiveSelected, range, force),
        getLatestReadings(),
      ]);
      setAnalytics(nextAnalytics);
      setLatestReadings(nextLatest);
      setLatestCheckedAt(new Date().getTime());
    }
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
  const selectedTanks = effectiveSelected.map((id) => uniqueTanks.find((tank) => tank.id === id)).filter((tank): tank is Tank => Boolean(tank));
  const latestByTank = useMemo(() => new Map(latestReadings.map((reading) => [reading.tank_id, reading])), [latestReadings]);
  const conditionForTank = (tankId: string): TankCondition => {
    const reading = latestByTank.get(tankId);
    if (!reading || latestCheckedAt - new Date(reading.recorded_at).getTime() > 5 * 60_000) return "OFFLINE";
    return classifyReading(reading);
  };
  const toggleTank = (id: string) => setSelected(effectiveSelected.includes(id) ? (effectiveSelected.length === 1 ? effectiveSelected : effectiveSelected.filter((item) => item !== id)) : [...effectiveSelected.slice(0, 6), id]);
  const metricCharts = [{ key: "level", label: "Comparative sewage level", unit: "%", suffix: "level" }, { key: "gas_level", label: "Comparative gas level", unit: " ppm", suffix: "gas" }] as const;
  const calibrationWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (analytics.readings.some((reading) => reading.level !== null && (reading.level < 0 || reading.level > 100))) warnings.push("A level sensor reported outside its calibrated 0–100% range.");
    if (analytics.readings.some((reading) => reading.gas_level !== null && reading.gas_level < 0)) warnings.push("A gas sensor reported a negative value.");
    for (const tankId of effectiveSelected) {
      const recent = analytics.readings.filter((reading) => reading.tank_id === tankId && reading.level !== null).slice(-5);
      if (recent.length === 5 && recent.every((reading) => reading.level === recent[0]!.level)) {
        warnings.push(`${uniqueTanks.find((tank) => tank.id === tankId)?.tank_name ?? tankId} has five identical level readings; verify sensor calibration.`);
      }
    }
    return warnings;
  }, [analytics.readings, effectiveSelected, uniqueTanks]);

  return <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-white via-white to-blue-50/70 p-4 shadow-sm sm:p-6">
    <div className="flex flex-col gap-5 border-b border-blue-100 pb-6 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-blue-700">Network intelligence</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Historical analytics</h2><p className="mt-1 max-w-2xl text-sm text-slate-500">Explore sensor performance, compare tank trends, and drag the navigator beneath any chart to zoom or pan.</p></div><div className="flex flex-wrap gap-2" aria-label="Analytics time range">{ranges.map((item) => <button key={item.value} type="button" onClick={() => setRange(item.value)} className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${range === item.value ? "border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-200" : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50"}`}>{item.label}</button>)}</div></div>
    <div className="py-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Compare tanks — up to 7</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => setSelected(uniqueTanks.slice(0, 7).map(({ id }) => id))} className="text-xs font-bold text-cyan-700">Select first 7</button>
          <button type="button" onClick={() => setSelected(uniqueTanks[0] ? [uniqueTanks[0].id] : [])} className="text-xs font-bold text-slate-600">Reset</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {uniqueTanks.map((tank) => {
          const active = effectiveSelected.includes(tank.id);
          const disabled = !active && effectiveSelected.length >= 7;
          const condition = conditionForTank(tank.id);
          return <button
            key={tank.id}
            type="button"
            aria-pressed={active}
            aria-label={`${tank.tank_name}, ${conditionLabels[condition]}${active ? ", selected" : ""}`}
            disabled={disabled}
            title={disabled ? "A maximum of seven tanks can be compared." : conditionLabels[condition]}
            onClick={() => toggleTank(tank.id)}
            className={`inline-flex items-center rounded-full border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${active ? "border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-200" : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50"}`}
          >
            {tank.tank_name}
            <span className={`ml-2 inline-block size-2.5 rounded-full ring-2 ${conditionDots[condition]} ${active ? "ring-white/60" : "ring-white"}`} aria-hidden="true"/>
          </button>;
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-semibold text-slate-600" aria-label="Tank status legend">
        <span className="font-bold uppercase tracking-wide text-slate-500">Tank status</span>
        {(["SAFE", "WARNING", "DANGER", "OFFLINE"] as const).map((condition) =>
          <span key={condition} className="inline-flex items-center gap-1.5">
            <span className={`size-2.5 rounded-full ${conditionDots[condition]}`} aria-hidden="true"/>
            {conditionLabels[condition]}
          </span>)}
      </div>
    </div>
    {error && <div role="alert" className="mb-4 rounded-xl border border-rose-800 bg-rose-950/60 px-4 py-3 text-sm text-rose-200">{error}</div>}
    {calibrationWarnings.length > 0 && <div role="alert" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"><p className="font-bold">Sensor calibration warning</p><ul className="mt-1 list-disc pl-5">{calibrationWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}
    <AnalyticsSummaryCards summary={analytics.summary} selectedCount={effectiveSelected.length} scopeLabel={effectiveSelected.length > 1 ? `Comparison group · ${effectiveSelected.length} tanks` : `Selected tank · ${selectedTanks[0]?.tank_name ?? "none"}`} />
    <div className={`mt-5 space-y-5 transition-opacity ${loading ? "opacity-60" : "opacity-100"}`} aria-busy={loading}>
      {comparisonData.length === 0 ? <div className="grid h-64 place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">No readings are available for this period.</div> : <div className="grid gap-5 lg:grid-cols-2">{metricCharts.map((metric) => <article key={metric.key} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5"><div className="mb-3 flex items-center justify-between"><div><h3 className="font-bold text-slate-900">{metric.label} ({metric.unit.trim()})</h3><p className="text-xs text-slate-500">{effectiveSelected.length > 1 ? `${effectiveSelected.length}-tank comparison · same colors identify tanks in both charts` : selectedTanks[0]?.tank_name}</p></div><span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Live refresh</span></div><TelemetryChart data={comparisonData} unit={metric.unit} yDomain={metric.key === "level" ? [0, 100] : [0, "auto"]} syncId="analytics-telemetry" series={selectedTanks.map((tank, index) => ({ key: `${tank.id}:${metric.suffix}`, name: tank.tank_name, color: colors[index % colors.length]! }))} /></article>)}</div>}
    </div>
    <p className="mt-4 text-right text-[11px] text-slate-500">Updated {analytics.generatedAt ? new Date(analytics.generatedAt).toLocaleTimeString("en-UG") : "—"} · every 30 seconds</p>
  </div>;
}
