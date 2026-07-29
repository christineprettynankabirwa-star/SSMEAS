"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AnalyticsDashboard from "@/components/dashboard/AnalyticsDashboard";
import TelemetryChart from "@/components/dashboard/TelemetryChart";
import type { AnalyticsReading, PredictionApiResponse, Tank } from "@/components/dashboard/types";
import { getAnalytics, getOverflowPredictions, getTanks } from "@/services/api";
import { ModuleError, ModuleLoading, ModuleScaffold } from "./ModuleScaffold";
import { useApiSession } from "./useApiSession";

const average = (values: number[]) =>
  values.length ? values.reduce((left, right) => left + right, 0) / values.length : 0;
const riskStyle: Record<PredictionApiResponse["risk_level"], string> = {
  UNKNOWN: "bg-slate-100 text-slate-700",
  LOW: "bg-emerald-50 text-emerald-700",
  MODERATE: "bg-yellow-50 text-yellow-700",
  HIGH: "bg-orange-50 text-orange-700",
  CRITICAL: "bg-red-50 text-red-700",
};

export default function AnalyticsPageClient() {
  const session = useApiSession();
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [all, setAll] = useState<AnalyticsReading[]>([]);
  const [predictions, setPredictions] = useState<PredictionApiResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const tanksResult = await getTanks()
      .then((value) => ({ ok: true as const, value }))
      .catch(() => ({ ok: false as const, value: [] }));
    setTanks(tanksResult.value);
    const [analyticsResult, predictionResult] = await Promise.allSettled([
      tanksResult.value.length
        ? getAnalytics(tanksResult.value.map(({ id }) => id), "all", true)
        : Promise.resolve(null),
      getOverflowPredictions(),
    ]);
    setAll(analyticsResult.status === "fulfilled" ? analyticsResult.value?.readings ?? [] : []);
    setPredictions(predictionResult.status === "fulfilled" ? predictionResult.value : []);
    const unavailable = [
      !tanksResult.ok && "tank registry",
      analyticsResult.status === "rejected" && "historical analytics",
      predictionResult.status === "rejected" && "predictive analytics",
    ].filter(Boolean);
    if (unavailable.length) setError(`Temporarily unavailable: ${unavailable.join(", ")}. Available analytics are shown below.`);
    setLoading(false);
  }, []);
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (session) void load();
      else if (session === false) setLoading(false);
    }, 0);
    return () => window.clearTimeout(id);
  }, [session, load]);

  const aggregates = useMemo(() => {
    const group = (unit: "day" | "week" | "month") => {
      const map = new Map<string, number[]>();
      all.forEach((reading) => {
        if (reading.level == null) return;
        const date = new Date(reading.recorded_at);
        if (Number.isNaN(date.getTime())) return;
        let bucket: Date;
        if (unit === "month") bucket = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
        else if (unit === "week") {
          bucket = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
          const day = bucket.getUTCDay() || 7;
          bucket.setUTCDate(bucket.getUTCDate() - day + 1);
        } else bucket = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
        const key = bucket.toISOString();
        (map.get(key) ?? map.set(key, []).get(key)!).push(reading.level);
      });
      return [...map].sort(([left], [right]) => left.localeCompare(right))
        .map(([recorded_at, values]) => ({ recorded_at, level: Number(average(values).toFixed(2)) }));
    };
    return { daily: group("day"), weekly: group("week"), monthly: group("month") };
  }, [all]);
  const recent = aggregates.daily.slice(-7);
  const trend = recent.length > 1 ? recent.at(-1)!.level - recent[0]!.level : 0;

  return <ModuleScaffold eyebrow="Network intelligence" title="Analytics" description="Compare telemetry, inspect aggregated operating patterns and review trend direction using recorded API data.">
    {loading ? <ModuleLoading /> : <div className="space-y-6">
      {error && <ModuleError message={error} retry={() => void load()} />}
      <AnalyticsDashboard tanks={tanks} />
      <div className="grid gap-5 xl:grid-cols-3">
        {([["Daily averages", aggregates.daily], ["Weekly averages", aggregates.weekly], ["Monthly averages", aggregates.monthly]] as const).map(([title, data]) =>
          <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-900">{title}</h2><p className="mb-4 text-xs text-slate-500">Network-wide sewage fill</p>
            {data.length ? <TelemetryChart data={data} unit="%" height={230} series={[{ key: "level", name: title, color: "#0891b2" }]} /> : <p className="grid h-52 place-items-center text-sm text-slate-500">No readings available for this interval.</p>}
          </article>)}
      </div>
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-900">Time-to-danger risk</h2>
        <p className="text-xs text-slate-500">Categories are determined only from OLS-estimated time to the 85% threshold.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">{predictions.map((prediction) => {
          const name = tanks.find(({ id }) => id === prediction.tank_id)?.tank_name ?? prediction.tank_id;
          return <div key={prediction.tank_id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
            <div><p className="text-sm font-semibold">{name}</p><p className="text-xs text-slate-500">{prediction.danger_projection.remainingHours == null ? "No reliable danger projection" : `${prediction.danger_projection.remainingHours.toFixed(1)} hours to 85%`}</p></div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${riskStyle[prediction.risk_level]}`}>{prediction.risk_level}</span>
          </div>;
        })}{!predictions.length && <p className="text-sm text-slate-500">No predictive analytics results are available.</p>}</div>
      </section>
      <article className="rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-white p-6 text-slate-950">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-700">Trend analysis</p>
        <div className="mt-3 flex flex-wrap items-end gap-5"><p className="text-4xl font-black">{trend >= 0 ? "+" : ""}{trend.toFixed(1)}%</p><p className="max-w-2xl text-sm text-slate-600">Change in network daily average across the latest available seven-day window. {trend > 3 ? "The rising trend warrants earlier collection planning." : trend < -3 ? "Average fill is declining following collection activity." : "The network is broadly stable."}</p></div>
      </article>
    </div>}
  </ModuleScaffold>;
}
