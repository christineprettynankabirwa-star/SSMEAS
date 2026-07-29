"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  getAlerts,
  getDashboardSummary,
  getLatestReadings,
  getMaintenance,
  getOverflowPredictions,
  getTanks,
} from "@/services/api";
import type {
  AlertItem,
  DashboardSummary,
  MaintenanceItem,
  PredictionApiResponse,
  SensorReading,
  Tank,
} from "./types";
import AppShell from "@/components/ui/AppShell";
import DashboardHeader from "./DashboardHeader";
import LoginForm from "./LoginForm";
import SummaryCards from "./SummaryCards";
import HighlightsCarousel from "./HighlightsCarousel";
import { useAuth } from "@/auth/AuthContext";
import { subscribeDataRefresh } from "@/services/data-refresh";
const links = [
  ["Tanks", "Asset registry", "/tanks"],
  ["Analytics", "Network trends", "/analytics"],
  ["GIS Map", "Spatial monitoring", "/map"],
  ["Alerts", "Incident management", "/alerts"],
  ["Maintenance", "Field operations", "/maintenance"],
  ["Routes", "Collection planning", "/route"],
];
export default function DashboardClient() {
  const { user, loading: authLoading, refresh, signOut, can } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceItem[]>([]);
  const [predictions, setPredictions] = useState<PredictionApiResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updated, setUpdated] = useState<Date | null>(null);
  const load = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    setError(null);
    const results = await Promise.allSettled([
      user?.role === "MAINTENANCE_OFFICER" ? Promise.resolve(null) : getDashboardSummary(),
      getTanks(),
      getLatestReadings(),
      getAlerts(),
      getMaintenance(),
      can("predictions") ? getOverflowPredictions() : Promise.resolve([]),
    ]);
    if (results[0].status === "fulfilled") setSummary(results[0].value);
    if (results[1].status === "fulfilled") setTanks(results[1].value);
    if (results[2].status === "fulfilled") setReadings(results[2].value);
    if (results[3].status === "fulfilled") setAlerts(results[3].value);
    if (results[4].status === "fulfilled") setMaintenance(results[4].value);
    if (results[5].status === "fulfilled") setPredictions(results[5].value);
    if (results.some((x) => x.status === "rejected"))
      setError("Some executive metrics are temporarily unavailable.");
    setUpdated(new Date());
    setLoading(false);
  }, [can, user?.role]);
  useEffect(() => {
    if (!user) return;

    const initialId = window.setTimeout(() => void load(), 0);
    const refreshId = window.setInterval(() => void load(true), 3_000);
    const unsubscribe = subscribeDataRefresh(() => void load(true));

    return () => {
      window.clearTimeout(initialId);
      window.clearInterval(refreshId);
      unsubscribe();
    };
  }, [user, load]);
  if (authLoading) return null;
  if (!user) return <LoginForm onAuthenticated={() => void refresh()} />;
  const latest = readings.reduce<SensorReading | null>(
    (a, b) => (!a || new Date(b.recorded_at) > new Date(a.recorded_at) ? b : a),
    null,
  );
  const critical = alerts
    .filter((a) => a.status === "ACTIVE" && a.severity === "critical")
    .slice(0, 5);
  const upcoming = maintenance
    .filter((m) => ["SCHEDULED", "ASSIGNED", "IN_PROGRESS"].includes(m.status))
    .sort((a, b) => +new Date(a.scheduled_for) - +new Date(b.scheduled_for))
    .slice(0, 5);
  const highRisk = predictions.filter((p) => p.risk_level === "HIGH" || p.risk_level === "CRITICAL").length;
  return (
    <AppShell>
      <DashboardHeader
        lastUpdated={updated}
        onSignOut={() => {
          signOut();
        }}
      />
      <main className="pt-16">
        <div className="mx-auto max-w-[1600px] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
          {error && (
            <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
              {error}
            </div>
          )}
          <section className="rounded-2xl border border-cyan-700/10 bg-white/90 p-6 text-slate-950 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-400">
              Executive overview
            </p>
            <h1 className="mt-2 text-3xl font-black">Operations Centre</h1>
            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              {[
                ["Registered tanks", summary?.totalTanks ?? tanks.length],
                ["Reporting devices", summary?.onlineTanks ?? 0],
                ["Active alerts", summary?.activeAlerts ?? 0],
                [
                  "Average fill",
                  `${(summary?.averageFillLevel ?? 0).toFixed(1)}%`,
                ],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="text-xs text-slate-400">{k}</p>
                  <p className="mt-1 text-2xl font-black">{v}</p>
                </div>
              ))}
            </div>
          </section>
          {loading ? (
            <div className="h-72 animate-pulse rounded-2xl bg-slate-200" />
          ) : (
            <>
              <SummaryCards
                reading={latest}
                lastUpdated={latest ? new Date(latest.recorded_at) : null}
              />
              <HighlightsCarousel
                tanks={tanks}
                readings={readings}
                alerts={alerts}
                maintenance={maintenance}
                route={null}
              />
              <div className="grid gap-5 xl:grid-cols-3">
                <section className="rounded-2xl bg-white p-5 shadow-sm">
                  <div className="flex justify-between">
                    <h2 className="font-bold">Recent critical alerts</h2>
                    <Link
                      href="/alerts"
                      className="text-xs font-bold text-cyan-700"
                    >
                      View all →
                    </Link>
                  </div>
                  {critical.length ? (
                    <div className="mt-4 space-y-3">
                      {critical.map((a) => (
                        <div key={a.id} className="rounded-xl bg-red-50 p-3">
                          <p className="font-bold text-red-800">
                            {a.alert_type}
                          </p>
                          <p className="text-xs text-red-700">
                            {a.tank_name} ·{" "}
                            {new Date(a.created_at).toLocaleString("en-UG")}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-5 text-sm text-slate-500">
                      No active critical alerts.
                    </p>
                  )}
                </section>
                <section className="rounded-2xl bg-white p-5 shadow-sm">
                  <div className="flex justify-between">
                    <h2 className="font-bold">Upcoming maintenance</h2>
                    <Link
                      href="/maintenance"
                      className="text-xs font-bold text-cyan-700"
                    >
                      Manage →
                    </Link>
                  </div>
                  {upcoming.length ? (
                    <div className="mt-4 space-y-3">
                      {upcoming.map((m) => (
                        <div
                          key={m.id}
                          className="border-b border-slate-100 pb-3"
                        >
                          <p className="font-semibold">{m.task}</p>
                          <p className="text-xs text-slate-500">
                            {m.tank_name} ·{" "}
                            {new Date(m.scheduled_for).toLocaleString("en-UG")}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-5 text-sm text-slate-500">
                      No upcoming work.
                    </p>
                  )}
                </section>
                {can("predictions") && <section className="rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-white p-5 text-slate-950 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-700">
                    Predictive analytics
                  </p>
                  <p className="mt-4 text-3xl font-black">
                    {highRisk} high-risk tanks
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Statistical trend analysis covers {predictions.length} reporting
                    tanks.{" "}
                    {highRisk
                      ? "Prioritize the highest-risk tanks in collection planning."
                      : "No immediate trend-based escalation is required."}
                  </p>
                  <Link
                    href="/analytics"
                    className="mt-5 inline-block rounded-lg bg-cyan-400 px-3 py-2 text-sm font-bold text-slate-950"
                  >
                    Open analytics
                  </Link>
                </section>}
              </div>
              <section>
                <h2 className="mb-4 text-lg font-bold text-slate-950">
                  Operations modules
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {links.filter(([, , href]) => {
                    if (href === "/analytics") return can("analytics");
                    if (href === "/route") return can("routes");
                    return true;
                  }).map(([name, desc, href]) => (
                    <Link
                      key={href}
                      href={href}
                      className="ui-interactive-card group rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur-xl"
                    >
                      <p className="font-bold text-slate-950">
                        {name}{" "}
                        <span className="float-right text-cyan-600">→</span>
                      </p>
                      <p className="mt-1 text-sm text-slate-500">{desc}</p>
                    </Link>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </AppShell>
  );
}
