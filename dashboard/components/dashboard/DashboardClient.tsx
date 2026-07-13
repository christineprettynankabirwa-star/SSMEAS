"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getLiveReading, getTanks } from "@/services/api";
import AlertsPanel from "./AlertsPanel";
import DashboardHeader from "./DashboardHeader";
import HistoricalChart from "./HistoricalChart";
import MaintenanceTable from "./MaintenanceTable";
import SummaryCards from "./SummaryCards";
import TankStatusCard from "./TankStatusCard";
import type { AlertItem, MaintenanceItem, SensorReading, Tank } from "./types";
const TankMap = dynamic(() => import("./TankMap"), { ssr: false, loading: () => <div className="h-[386px] animate-pulse rounded-2xl bg-slate-200" /> });
const alerts: AlertItem[] = [{ id: "alert-1", title: "High-fill warning", detail: "Tank telemetry rules will populate this alert feed.", severity: "warning", created_at: "Awaiting alerts API" }];
const maintenance: MaintenanceItem[] = [{ id: "maintenance-1", tank_name: "Awaiting tank data", task: "Inspect sensor enclosure", scheduled_for: "To be scheduled", status: "Scheduled" }];
export default function DashboardClient() {
  const [tanks, setTanks] = useState<Tank[]>([]); const [reading, setReading] = useState<SensorReading | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { setLoading(true); setError(null); const [tankResult, readingResult] = await Promise.allSettled([getTanks(), getLiveReading()]); if (tankResult.status === "fulfilled") setTanks(tankResult.value); if (readingResult.status === "fulfilled") setReading(readingResult.value); if (tankResult.status === "rejected" && readingResult.status === "rejected") setError("Unable to reach the monitoring API. Confirm the backend is running and the API URL is configured."); else if (tankResult.status === "rejected" || readingResult.status === "rejected") setError("Some live data is currently unavailable. The dashboard is showing the information that could be loaded."); setLoading(false); }, []);
  useEffect(() => {
    const initialLoadId = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(initialLoadId);
  }, [load]);
  const onlineTanks = useMemo(() => reading ? tanks.filter((tank) => tank.status === "ACTIVE").length : 0, [reading, tanks]);
  return <main className="min-h-screen bg-slate-50"><div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8"><DashboardHeader />{error && <div role="alert" className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><span>{error}</span><button type="button" onClick={() => void load()} className="rounded-lg bg-amber-700 px-3 py-1.5 font-semibold text-white hover:bg-amber-800">Retry</button></div>}<div className="mt-6"><SummaryCards totalTanks={tanks.length} onlineTanks={onlineTanks} activeAlerts={alerts.length} averageFillLevel={reading?.level ?? null} /></div>{loading ? <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <div key={index} className="h-56 animate-pulse rounded-2xl bg-slate-200" />)}</section> : <><section className="mt-6"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-bold text-slate-950">Live tank status</h2><p className="mt-1 text-sm text-slate-600">Most recent telemetry returned by the SSMEAS backend.</p></div><button type="button" onClick={() => void load()} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">Refresh</button></div>{tanks.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">No tanks are registered yet. Add a tank through the backend to see its live status.</div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{tanks.map((tank) => <TankStatusCard key={tank.id} tank={tank} reading={reading} />)}</div>}</section><section className="mt-6 grid gap-6 xl:grid-cols-2"><HistoricalChart /><TankMap tanks={tanks} /></section><section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.6fr]"><AlertsPanel alerts={alerts} /><MaintenanceTable items={maintenance} /></section></>}</div></main>;
}
