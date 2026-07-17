"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { getAlerts, getDashboardSummary, getLiveReading, getMaintenance, getOptimizedRoute, getOverflowPrediction, getTanks, setAccessToken } from "@/services/api";
import AlertsPanel from "./AlertsPanel";
import ActivityFeed from "./ActivityFeed";
import DashboardHeader from "./DashboardHeader";
import HistoricalChart from "./HistoricalChart";
import MaintenanceTable from "./MaintenanceTable";
import LoginForm from "./LoginForm";
import OperationsNav from "./OperationsNav";
import OptimizedRoutePanel from "./OptimizedRoutePanel";
import PredictionPanel from "./PredictionPanel";
import SummaryCards from "./SummaryCards";
import TankMonitoringTable from "./TankMonitoringTable";
import TankStatusCard from "./TankStatusCard";
import type { AlertItem, DashboardSummary, MaintenanceItem, OptimizedRoute, OverflowPrediction, SensorReading, Tank } from "./types";

const TankMap = dynamic(() => import("./TankMap"), {
  ssr: false,
  loading: () => <div className="h-[386px] animate-pulse rounded-2xl bg-slate-200" />,
});

const emptySummary: DashboardSummary = { totalTanks: 0, onlineTanks: 0, activeAlerts: 0, averageFillLevel: 0 };

export default function DashboardClient() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [reading, setReading] = useState<SensorReading | null>(null);
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceItem[]>([]);
  const [prediction, setPrediction] = useState<OverflowPrediction | null>(null);
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTankId, setSelectedTankId] = useState<string | undefined>();

  const load = useCallback(async () => {
    setError(null);
    const [tanksResult, readingResult] = await Promise.allSettled([getTanks(), getLiveReading()]);
    const [summaryResult, alertsResult, maintenanceResult, routeResult] = await Promise.allSettled([
      getDashboardSummary(), getAlerts(), getMaintenance(), getOptimizedRoute(),
    ]);

    if (tanksResult.status === "fulfilled") setTanks(tanksResult.value);
    if (readingResult.status === "fulfilled") setReading(readingResult.value);
    if (summaryResult.status === "fulfilled") setSummary(summaryResult.value);
    if (alertsResult.status === "fulfilled") setAlerts(alertsResult.value.filter((alert) => alert.status === "ACTIVE"));
    if (maintenanceResult.status === "fulfilled") setMaintenance(maintenanceResult.value);
    if (routeResult.status === "fulfilled") setOptimizedRoute(routeResult.value);

    const requests = [["tank registry", tanksResult], ["live telemetry", readingResult], ["system summary", summaryResult], ["alerts", alertsResult], ["maintenance", maintenanceResult], ["route optimization", routeResult]] as const;
    const unavailable = requests.filter(([, result]) => result.status === "rejected").map(([label]) => label);
    const failedRequests = unavailable.length;
    if (failedRequests === requests.length) setError("Unable to reach the monitoring API. Confirm the backend is running and the API URL is configured.");
    else {
      if (failedRequests > 0) setError(`Temporarily unavailable: ${unavailable.join(", ")}. Showing the remaining data.`);
      setLastUpdated(new Date());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const authenticationId = window.setTimeout(() => {
      const token = window.sessionStorage.getItem("ssmeas_access_token");
      setAccessToken(token);
      setAuthenticated(Boolean(token));
    }, 0);
    return () => window.clearTimeout(authenticationId);
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    const initialLoadId = window.setTimeout(() => { void load(); }, 0);
    const refreshId = window.setInterval(() => { void load(); }, 30_000);
    return () => {
      window.clearTimeout(initialLoadId);
      window.clearInterval(refreshId);
    };
  }, [authenticated, load]);

  const historyTankId = selectedTankId ?? reading?.tank_id ?? tanks[0]?.id;
  const historyTank = tanks.find((tank) => tank.id === historyTankId);

  useEffect(() => {
    if (!authenticated || !historyTankId) return;
    let active = true;
    void getOverflowPrediction(historyTankId).then((value) => { if (active) setPrediction(value); }).catch(() => { if (active) setPrediction(null); });
    return () => { active = false; };
  }, [authenticated, historyTankId, reading]);

  const signOut = () => {
    window.sessionStorage.removeItem("ssmeas_access_token");
    setAccessToken(null);
    setAuthenticated(false);
  };

  if (authenticated === null) return null;
  if (!authenticated) return <LoginForm onAuthenticated={() => setAuthenticated(true)} />;

  return (
    <div className="min-h-screen bg-[#f3f6f9] lg:flex">
      <OperationsNav onSignOut={signOut} />
      <main id="overview" className="min-w-0 flex-1 scroll-mt-6">
      <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-7 lg:py-6">
        <DashboardHeader lastUpdated={lastUpdated} />
        {error && <div role="alert" className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-amber-200/80 bg-amber-50/70 px-4 py-3 text-sm text-amber-900"><span>{error}</span><button type="button" onClick={() => void load()} className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-semibold text-amber-800 transition hover:bg-amber-100">Retry</button></div>}
        <div className="mt-5"><SummaryCards totalTanks={summary.totalTanks} onlineTanks={summary.onlineTanks} activeAlerts={summary.activeAlerts} averageFillLevel={summary.averageFillLevel} reading={reading} /></div>
        {loading ? <section className="grid min-h-[360px] place-items-center" aria-label="Loading dashboard"><div className="text-center"><span className="inline-block size-10 animate-spin rounded-full border-4 border-cyan-100 border-t-cyan-600" aria-hidden="true" /><p className="mt-3 text-sm font-medium text-slate-600">Loading dashboard...</p></div></section> : <>
          <section className="mt-6 grid items-start gap-5 2xl:grid-cols-[1.08fr_0.92fr]"><div><div className="mb-4"><p className="eyebrow">Live network</p><h2 className="section-title">Tank status</h2><p className="section-copy">At-a-glance condition of every monitored asset</p></div>{tanks.length === 0 ? <div className="panel-card border-dashed p-8 text-center text-sm text-slate-600">No tanks are registered yet.</div> : <div className="grid gap-3 md:grid-cols-2">{tanks.slice(0, 4).map((tank) => <TankStatusCard key={tank.id} tank={tank} reading={reading?.tank_id === tank.id ? reading : null} />)}</div>}</div><div id="locations" className="scroll-mt-6"><TankMap tanks={tanks} /></div></section>
          <div className="mt-6"><TankMonitoringTable tanks={tanks} reading={reading} query={searchQuery} onQueryChange={setSearchQuery} onSelect={(tankId) => { setSelectedTankId(tankId); document.querySelector("#analytics")?.scrollIntoView({ behavior: "smooth" }); }} /></div>
          <section id="analytics" className="mt-6 scroll-mt-6"><HistoricalChart tankId={historyTankId} tankName={historyTank?.tank_name} /></section>
          <section className="mt-6 grid items-start gap-5 xl:grid-cols-2"><PredictionPanel prediction={prediction} /><OptimizedRoutePanel route={optimizedRoute} /></section>
          <section id="operations" className="mt-6 grid scroll-mt-6 items-start gap-5 xl:grid-cols-[0.78fr_1.22fr]"><ActivityFeed alerts={alerts} maintenance={maintenance} /><div className="grid gap-5"><AlertsPanel alerts={alerts} /><MaintenanceTable items={maintenance} /></div></section>
        </>}
      </div>
      </main>
    </div>
  );
}
