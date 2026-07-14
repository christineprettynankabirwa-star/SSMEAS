"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getAlerts, getDashboardSummary, getLiveReading, getMaintenance, getTanks } from "@/services/api";
import AlertsPanel from "./AlertsPanel";
import DashboardHeader from "./DashboardHeader";
import HistoricalChart from "./HistoricalChart";
import MaintenanceTable from "./MaintenanceTable";
import SummaryCards from "./SummaryCards";
import TankStatusCard from "./TankStatusCard";
import type { AlertItem, DashboardSummary, MaintenanceItem, SensorReading, Tank } from "./types";

const TankMap = dynamic(() => import("./TankMap"), {
  ssr: false,
  loading: () => <div className="h-[386px] animate-pulse rounded-2xl bg-slate-200" />,
});

const emptySummary: DashboardSummary = { totalTanks: 0, onlineTanks: 0, activeAlerts: 0, averageFillLevel: 0 };

export default function DashboardClient() {
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [reading, setReading] = useState<SensorReading | null>(null);
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const [tanksResult, readingResult] = await Promise.allSettled([getTanks(), getLiveReading()]);
    const [summaryResult, alertsResult, maintenanceResult] = await Promise.allSettled([
      getDashboardSummary(), getAlerts(), getMaintenance(),
    ]);

    if (tanksResult.status === "fulfilled") setTanks(tanksResult.value);
    if (readingResult.status === "fulfilled") setReading(readingResult.value);
    if (summaryResult.status === "fulfilled") setSummary(summaryResult.value);
    if (alertsResult.status === "fulfilled") setAlerts(alertsResult.value.filter((alert) => alert.status === "ACTIVE"));
    if (maintenanceResult.status === "fulfilled") setMaintenance(maintenanceResult.value);

    const failedRequests = [tanksResult, readingResult, summaryResult, alertsResult, maintenanceResult]
      .filter((result) => result.status === "rejected").length;
    if (failedRequests === 5) setError("Unable to reach the monitoring API. Confirm the backend is running and the API URL is configured.");
    else {
      if (failedRequests > 0) setError("Some dashboard data is currently unavailable. The remaining live data is shown below.");
      setLastUpdated(new Date());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const initialLoadId = window.setTimeout(() => { void load(); }, 0);
    const refreshId = window.setInterval(() => { void load(); }, 30_000);
    return () => {
      window.clearTimeout(initialLoadId);
      window.clearInterval(refreshId);
    };
  }, [load]);

  const historyTankId = reading?.tank_id ?? tanks[0]?.id;
  const historyTank = useMemo(() => tanks.find((tank) => tank.id === historyTankId), [historyTankId, tanks]);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
        <DashboardHeader lastUpdated={lastUpdated} />
        {error && <div role="alert" className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><span>{error}</span><button type="button" onClick={() => void load()} className="rounded-lg bg-amber-700 px-3 py-1.5 font-semibold text-white hover:bg-amber-800">Retry</button></div>}
        <div className="mt-6"><SummaryCards totalTanks={summary.totalTanks} onlineTanks={summary.onlineTanks} activeAlerts={summary.activeAlerts} averageFillLevel={summary.averageFillLevel} /></div>
        {loading ? <section className="grid min-h-[360px] place-items-center" aria-label="Loading dashboard"><div className="text-center"><span className="inline-block size-10 animate-spin rounded-full border-4 border-cyan-100 border-t-cyan-600" aria-hidden="true" /><p className="mt-3 text-sm font-medium text-slate-600">Loading dashboard...</p></div></section> : <>
          <section className="mt-6"><div className="mb-4"><h2 className="text-xl font-bold text-slate-950">Live tank status</h2><p className="mt-1 text-sm text-slate-600">Telemetry refreshes automatically every 30 seconds.</p></div>{tanks.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">No tanks are registered yet. Add a tank through the backend to see its live status.</div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{tanks.map((tank) => <TankStatusCard key={tank.id} tank={tank} reading={reading?.tank_id === tank.id ? reading : null} />)}</div>}</section>
          <section className="mt-6 grid gap-6 xl:grid-cols-2"><HistoricalChart tankId={historyTankId} tankName={historyTank?.tank_name} /><TankMap tanks={tanks} /></section>
          <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.6fr]"><AlertsPanel alerts={alerts} /><MaintenanceTable items={maintenance} /></section>
        </>}
      </div>
    </main>
  );
}
