"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/ui/AppShell";
import { useAuth } from "@/auth/AuthContext";
import {
  generateSimulationReading, getLatestReadings, getTanks, resetAllTestTanks,
  resetSimulationTank, type SimulationCondition, type SimulationResult,
} from "@/services/api";
import { announceDataRefresh } from "@/services/data-refresh";
import type { SensorReading, Tank } from "@/components/dashboard/types";
import { classifyReading } from "@/services/alert-thresholds";

const condition = (reading?: SensorReading): SimulationCondition | "OFFLINE" =>
  classifyReading(reading);

export default function TestingSimulationClient() {
  const { user, loading: authLoading } = useAuth();
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [nextTanks, nextReadings] = await Promise.all([getTanks(), getLatestReadings()]);
    setTanks(nextTanks);
    setReadings(nextReadings);
    setSelected((value) => value || nextTanks[0]?.id || "");
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (user?.role === "ADMINISTRATOR") {
        void load().catch(() => setError("Testing data could not be loaded."));
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [user, load]);

  const run = async (
    operation: () => Promise<SimulationResult | { results: SimulationResult[] }>,
  ) => {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await operation();
      const results = "results" in response ? response.results : [response];
      setMessage(results.length
        ? `${results.length} tank${results.length === 1 ? "" : "s"} updated. `
          + `${results.reduce((sum, item) => sum + item.resolvedAlerts, 0)} alerts resolved and `
          + `${results.reduce((sum, item) => sum + item.cancelledMaintenance, 0)} maintenance tasks cancelled.`
        : "No unsafe test tanks required a reset.");
      announceDataRefresh();
      await load();
    } catch {
      setError("The action could not be completed. No historical records were removed.");
    } finally {
      setBusy(false);
    }
  };

  if (authLoading || user?.role !== "ADMINISTRATOR") return null;
  const latest = new Map(readings.map((reading) => [reading.tank_id, reading]));

  return <AppShell><main className="min-h-screen bg-[#f3f4f6] p-5 pt-20 lg:p-8">
    <div className="mx-auto max-w-5xl space-y-5">
      <header>
        <p className="text-xs font-black uppercase text-cyan-700">Administrator tools</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Testing &amp; Simulation</h1>
        <p className="mt-2 text-sm text-slate-600">Create append-only telemetry and restore tested tanks to a safe operating condition.</p>
      </header>
      {message && <div role="status" className="border-l-4 border-emerald-500 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{message}</div>}
      {error && <div role="alert" className="border-l-4 border-red-500 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</div>}
      <section className="border border-slate-200 bg-white p-5 shadow-sm">
        <label htmlFor="simulation-tank" className="text-sm font-bold text-slate-800">Selected tank</label>
        <select id="simulation-tank" value={selected} onChange={(event) => setSelected(event.target.value)}
          className="mt-2 w-full border border-slate-300 bg-white px-3 py-3 text-sm">
          {tanks.map((tank) => <option key={tank.id} value={tank.id}>
            {tank.tank_name} - {condition(latest.get(tank.id))}
          </option>)}
        </select>
        {selected && <dl className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="bg-slate-50 p-3"><dt className="text-xs text-slate-500">Condition</dt><dd className="mt-1 font-bold">{condition(latest.get(selected))}</dd></div>
          <div className="bg-slate-50 p-3"><dt className="text-xs text-slate-500">Fill level</dt><dd className="mt-1 font-bold">{latest.get(selected)?.level?.toFixed(1) ?? "Unavailable"}%</dd></div>
          <div className="bg-slate-50 p-3"><dt className="text-xs text-slate-500">Gas level</dt><dd className="mt-1 font-bold">{latest.get(selected)?.gas_level?.toFixed(0) ?? "Unavailable"} ppm</dd></div>
        </dl>}
      </section>
      <section className="border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold">Reset operations</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" disabled={busy || !selected} onClick={() => void run(() => resetSimulationTank(selected))}
            className="bg-emerald-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">Reset Selected Tank</button>
          <button type="button" disabled={busy} onClick={() => void run(resetAllTestTanks)}
            className="border border-red-300 bg-white px-4 py-3 text-sm font-bold text-red-800 disabled:opacity-50">Reset All Test Tanks</button>
        </div>
      </section>
      <section className="border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold">Generate reading</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {(["SAFE", "WARNING", "DANGER"] as const).map((value) =>
            <button key={value} type="button" disabled={busy || !selected}
              onClick={() => void run(() => generateSimulationReading(selected, value))}
              className={`border px-4 py-3 text-sm font-bold disabled:opacity-50 ${
                value === "SAFE" ? "border-emerald-300 text-emerald-800"
                  : value === "WARNING" ? "border-amber-300 text-amber-800"
                    : "border-red-300 text-red-800"}`}>
              Generate {value} Reading
            </button>)}
        </div>
      </section>
    </div>
  </main></AppShell>;
}
