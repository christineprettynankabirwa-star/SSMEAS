"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import type { AlertItem, Tank } from "@/components/dashboard/types";
import { acknowledgeAlert, getAlerts, getTanks } from "@/services/api";
import { announceDataRefresh, subscribeDataRefresh } from "@/services/data-refresh";
import { ModuleError, ModuleLoading, ModuleScaffold } from "./ModuleScaffold";
import { useApiSession } from "./useApiSession";

const tone = {
  critical: "bg-red-100 text-red-700",
  warning: "bg-amber-100 text-amber-700",
  info: "bg-blue-100 text-blue-700",
};

export default function AlertsPageClient() {
  const session = useApiSession();
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("all");
  const [tank, setTank] = useState("all");
  const [status, setStatus] = useState("all");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    try {
      setAlerts(await getAlerts());
      setTanks(await getTanks().catch(() => []));
      setError(null);
    } catch {
      setError("Alert history could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => {
      if (session) void load();
      else if (session === false) setLoading(false);
    }, 0);
    const interval = window.setInterval(() => {
      if (session) void load(true);
    }, 3_000);
    const unsubscribe = subscribeDataRefresh(() => void load(true));
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
      unsubscribe();
    };
  }, [session, load]);

  const filtered = useMemo(() => alerts.filter((alert) =>
    (severity === "all" || alert.severity === severity)
    && (tank === "all" || alert.tank_id === tank)
    && (status === "all" || alert.status === status)
    && (!date || alert.created_at.slice(0, 10) === date)
    && (!query || [alert.alert_type, alert.tank_name, alert.message]
      .some((value) => value.toLowerCase().includes(query.toLowerCase()))),
  ), [alerts, severity, tank, status, date, query]);

  const acknowledge = async (id: string) => {
    try {
      const value = await acknowledgeAlert(id);
      setAlerts((items) => items.map((item) => item.id === id ? value : item));
      announceDataRefresh();
    } catch {
      setError("The alert could not be acknowledged. Check your role and try again.");
    }
  };
  const counts = {
    active: alerts.filter(({ status: value }) => value === "ACTIVE").length,
    acknowledged: alerts.filter(({ status: value }) => value === "ACKNOWLEDGED").length,
    resolved: alerts.filter(({ status: value }) => value === "RESOLVED").length,
  };

  return <ModuleScaffold eyebrow="Incident management" title="Alerts"
    description="Search, filter, acknowledge and audit every monitoring alert.">
    {loading ? <ModuleLoading/> : error && alerts.length === 0
      ? <ModuleError message={error} retry={() => void load()}/>
      : <div className="space-y-5">
        {error && <ModuleError message={error}/>}
        <div className="grid gap-4 sm:grid-cols-3">
          {Object.entries(counts).map(([label, value]) => <div key={label} className="bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-500">{label} alerts</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
          </div>)}
        </div>
        <section className="border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-3 border-b p-5 md:grid-cols-5">
            <input value={query} onChange={(event) => setQuery(event.target.value)}
              placeholder="Search alerts" className="border p-2 text-sm"/>
            <select value={severity} onChange={(event) => setSeverity(event.target.value)} className="border p-2 text-sm">
              <option value="all">All severities</option><option value="critical">Critical</option>
              <option value="warning">Warning</option><option value="info">Info</option>
            </select>
            <select value={tank} onChange={(event) => setTank(event.target.value)} className="border p-2 text-sm">
              <option value="all">All tanks</option>
              {tanks.map((item) => <option key={item.id} value={item.id}>{item.tank_name}</option>)}
            </select>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="border p-2 text-sm">
              <option value="all">All statuses</option><option>ACTIVE</option>
              <option>ACKNOWLEDGED</option><option>RESOLVED</option>
            </select>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="border p-2 text-sm"/>
          </div>
          <div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>
              {["Alert type", "Tank", "Severity", "Created", "Status", "Lifecycle", "Message", "Action"]
                .map((label) => <th key={label} className="px-4 py-3">{label}</th>)}
            </tr></thead>
            <tbody className="divide-y">{filtered.map((alert) => <tr key={alert.id}>
              <td className="px-4 py-4 font-bold">{alert.alert_type}</td>
              <td className="px-4"><Link className="text-cyan-800 hover:underline"
                href={`/tanks/${alert.tank_id}`}>{alert.tank_name}</Link></td>
              <td className="px-4"><span className={`px-2 py-1 text-xs font-bold ${tone[alert.severity]}`}>
                {alert.severity}</span></td>
              <td className="whitespace-nowrap px-4">{new Date(alert.created_at).toLocaleString("en-UG")}</td>
              <td className="px-4 font-semibold">{alert.status}</td>
              <td className="px-4 text-xs text-slate-600">
                {alert.acknowledged_at && <span className="block">Seen by {alert.acknowledged_by_name ?? "Administrator"} at {new Date(alert.acknowledged_at).toLocaleString("en-UG")}</span>}
                {alert.resolved_at && <span className="block">Safe at {new Date(alert.resolved_at).toLocaleString("en-UG")}</span>}
                {!alert.acknowledged_at && !alert.resolved_at && "Awaiting acknowledgement"}
              </td>
              <td className="max-w-md px-4 text-slate-600">{alert.message}</td>
              <td className="px-4">{alert.status === "ACTIVE" && user?.role === "ADMINISTRATOR"
                ? <button onClick={() => void acknowledge(alert.id)}
                    className="bg-cyan-700 px-3 py-2 text-xs font-bold text-white">Acknowledge</button>
                : "-"}</td>
            </tr>)}
            {!filtered.length && <tr><td colSpan={8} className="p-12 text-center text-slate-500">
              No alerts match the selected filters.</td></tr>}
            </tbody>
          </table></div>
        </section>
      </div>}
  </ModuleScaffold>;
}
