"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AnalyticsDashboard from "@/components/dashboard/AnalyticsDashboard";
import TelemetryChart from "@/components/dashboard/TelemetryChart";
import type { AnalyticsReading, PredictionApiResponse, Tank } from "@/components/dashboard/types";
import { getAnalytics, getOverflowPredictions, getTanks } from "@/services/api";
import { ModuleError, ModuleLoading, ModuleScaffold } from "./ModuleScaffold";
import { useApiSession } from "./useApiSession";

const DEMO_TANKS: Tank[] = [
  {
    id: "demo-warning-tank",
    tank_name: "Demo Warning Tank",
    owner_name: "Demo Owner",
    location: "Demo Location",
    latitude: 0.3476,
    longitude: 32.5825,
    capacity_liters: 10_000,
    status: "ACTIVE",
    hardware_id: "DEMO-WARNING-001",
    warning_fill_threshold: 65,
    critical_fill_threshold: 85,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "demo-critical-tank",
    tank_name: "Demo Critical Tank",
    owner_name: "Demo Owner",
    location: "Demo Location",
    latitude: 0.3476,
    longitude: 32.5825,
    capacity_liters: 10_000,
    status: "ACTIVE",
    hardware_id: "DEMO-CRITICAL-001",
    warning_fill_threshold: 65,
    critical_fill_threshold: 85,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

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
  const [selectedTankIds, setSelectedTankIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const tanksResult = await getTanks()
      .then((value) => ({ ok: true as const, value: [...DEMO_TANKS, ...value] }))
      .catch(() => ({ ok: false as const, value: [...DEMO_TANKS] }));
    setTanks(tanksResult.value);
    const requestedTankId = new URLSearchParams(window.location.search).get("tank");
    setSelectedTankIds((current) => requestedTankId && tanksResult.value.some((tank) => tank.id === requestedTankId)
      ? [requestedTankId]
      : current.length
        ? current.filter((id) => tanksResult.value.some((tank) => tank.id === id)).slice(0, 7)
        : [tanksResult.value[0]!.id]);
    const [analyticsResult, predictionResult] = await Promise.allSettled([
      tanksResult.value.length
        ? getAnalytics(tanksResult.value.map(({ id }) => id), "all", true)
        : Promise.resolve(null),
      getOverflowPredictions(),
    ]);
    const baseReadings = analyticsResult.status === "fulfilled" ? analyticsResult.value?.readings ?? [] : [];
    const now = new Date().toISOString();
    const demoReadings: AnalyticsReading[] = [
      { recorded_at: now, tank_id: "demo-warning-tank", level: 72, gas_level: 180 },
      { recorded_at: now, tank_id: "demo-critical-tank", level: 92, gas_level: 350 },
    ];
    setAll([...demoReadings, ...baseReadings]);
    const basePredictions = predictionResult.status === "fulfilled" ? predictionResult.value : [];
    const demoPredictions: PredictionApiResponse[] = [
      {
        tank_id: "demo-warning-tank",
        current_level: 72,
        current_volume_cubic_meters: 7.2,
        fill_velocity_percent_per_hour: 0.5,
        historical_average_daily_increase: 8,
        remaining_capacity_percent: 28,
        remaining_capacity_cubic_meters: 2.8,
        prediction_quality_status: "GOOD",
        data_quality_issues: [],
        filling_cycle_started_at: null,
        warning_projection: { thresholdPercent: 65, estimatedArrivalAt: null, remainingHours: null, status: "STABLE_OR_FALLING", predictionInterval95: { earliestArrivalAt: null, latestArrivalAt: null, minimumHours: null, maximumHours: null } },
        danger_projection: { thresholdPercent: 85, estimatedArrivalAt: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(), remainingHours: 26, status: "PROJECTED", predictionInterval95: { earliestArrivalAt: null, latestArrivalAt: null, minimumHours: null, maximumHours: null } },
        overflow_projection: { thresholdPercent: 100, estimatedArrivalAt: null, remainingHours: null, status: "INSUFFICIENT_DATA", predictionInterval95: { earliestArrivalAt: null, latestArrivalAt: null, minimumHours: null, maximumHours: null } },
        risk_level: "MODERATE",
        confidence: 0.82,
        maintenance_recommendation: { recommendedAt: null, reason: "Projected to reach 85% within planning horizon.", predictionConfidence: 0.82, safetyBufferHours: 6, approvalRequired: true },
        samples: 12,
        generated_at: now,
      },
      {
        tank_id: "demo-critical-tank",
        current_level: 92,
        current_volume_cubic_meters: 9.2,
        fill_velocity_percent_per_hour: 1.2,
        historical_average_daily_increase: 15,
        remaining_capacity_percent: 8,
        remaining_capacity_cubic_meters: 0.8,
        prediction_quality_status: "GOOD",
        data_quality_issues: [],
        filling_cycle_started_at: null,
        warning_projection: { thresholdPercent: 65, estimatedArrivalAt: null, remainingHours: null, status: "STABLE_OR_FALLING", predictionInterval95: { earliestArrivalAt: null, latestArrivalAt: null, minimumHours: null, maximumHours: null } },
        danger_projection: { thresholdPercent: 85, estimatedArrivalAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), remainingHours: -2, status: "THRESHOLD_REACHED", predictionInterval95: { earliestArrivalAt: null, latestArrivalAt: null, minimumHours: null, maximumHours: null } },
        overflow_projection: { thresholdPercent: 100, estimatedArrivalAt: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString(), remainingHours: 7, status: "PROJECTED", predictionInterval95: { earliestArrivalAt: null, latestArrivalAt: null, minimumHours: null, maximumHours: null } },
        risk_level: "CRITICAL",
        confidence: 0.91,
        maintenance_recommendation: { recommendedAt: new Date().toISOString(), reason: "Tank has exceeded the 85% danger threshold and is projected to overflow.", predictionConfidence: 0.91, safetyBufferHours: 6, approvalRequired: true },
        samples: 24,
        generated_at: now,
      },
    ];
    setPredictions([...demoPredictions, ...basePredictions]);
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

  const selectedReadings = useMemo(() => all.filter((reading) => selectedTankIds.includes(reading.tank_id)), [all, selectedTankIds]);
  const selectedPredictions = useMemo(() => predictions.filter((prediction) => selectedTankIds.includes(prediction.tank_id)), [predictions, selectedTankIds]);
  const scopeText = selectedTankIds.length > 1 ? `${selectedTankIds.length}-tank comparison group` : tanks.find((tank) => tank.id === selectedTankIds[0])?.tank_name ?? "selected tank";
  const aggregates = useMemo(() => {
    const group = (unit: "day" | "week" | "month") => {
      const map = new Map<string, number[]>();
      selectedReadings.forEach((reading) => {
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
  }, [selectedReadings]);
  const recent = aggregates.daily.slice(-7);
  const trend = recent.length > 1 ? recent.at(-1)!.level - recent[0]!.level : 0;

  return <ModuleScaffold eyebrow="Network intelligence" title="Analytics" description="Compare telemetry, inspect aggregated operating patterns and review trend direction using recorded API data.">
    {loading ? <ModuleLoading /> : <div className="space-y-6">
      {error && <ModuleError message={error} retry={() => void load()} />}
      <AnalyticsDashboard tanks={tanks} selectedTankIds={selectedTankIds} onSelectedTankIdsChange={setSelectedTankIds} />
      <div className="grid gap-5 xl:grid-cols-3">
        {([["Daily averages", aggregates.daily], ["Weekly averages", aggregates.weekly], ["Monthly averages", aggregates.monthly]] as const).map(([title, data]) =>
          <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-900">{title}</h2><p className="mb-4 text-xs text-slate-500">Sewage fill · {scopeText}</p>
            {data.length ? <TelemetryChart data={data} unit="%" height={230} series={[{ key: "level", name: title, color: "#0891b2" }]} /> : <p className="grid h-52 place-items-center text-sm text-slate-500">No readings available for this interval.</p>}
          </article>)}
      </div>
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-900">Time-to-danger risk</h2>
        <p className="text-xs text-slate-500">Categories are determined only from OLS-estimated time to the 85% threshold.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">{selectedPredictions.map((prediction) => {
          const name = tanks.find(({ id }) => id === prediction.tank_id)?.tank_name ?? prediction.tank_id;
          return <div key={prediction.tank_id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
            <div><p className="text-sm font-semibold">{name}</p><p className="text-xs text-slate-500">{prediction.danger_projection.remainingHours == null ? "No reliable danger projection" : `${prediction.danger_projection.remainingHours.toFixed(1)} hours to 85%`}</p></div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${riskStyle[prediction.risk_level]}`}>{prediction.risk_level}</span>
          </div>;
        })}{!selectedPredictions.length && <p className="text-sm text-slate-500">No predictive analytics results are available for the selected tank group.</p>}</div>
      </section>
      <article className="rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-white p-6 text-slate-950">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-700">Trend analysis</p>
        <div className="mt-3 flex flex-wrap items-end gap-5"><p className="text-4xl font-black">{trend >= 0 ? "+" : ""}{trend.toFixed(1)}%</p><p className="max-w-2xl text-sm text-slate-600">Change in the {scopeText} daily average across the latest available seven-day window. {trend > 3 ? "The rising trend warrants earlier collection planning." : trend < -3 ? "Average fill is declining following collection activity." : "The selected scope is broadly stable."}</p></div>
      </article>
    </div>}
  </ModuleScaffold>;
}
