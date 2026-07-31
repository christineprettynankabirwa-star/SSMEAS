"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import type { AlertItem, MaintenanceOfficer, Tank } from "@/components/dashboard/types";
import CreateTaskModal, { type CreateTaskValues } from "@/components/maintenance/CreateTaskModal";
import { apiErrorMessage } from "@/components/admin/userManagement";
import {
  acknowledgeAlert, createMaintenance, getAlerts, getMaintenanceOfficers,
  getTanks, resolveAlert,
} from "@/services/api";
import { announceDataRefresh, subscribeDataRefresh } from "@/services/data-refresh";
import { ModuleError, ModuleLoading, ModuleScaffold } from "./ModuleScaffold";
import { useApiSession } from "./useApiSession";

const tone = {
  critical: "bg-red-100 text-red-700",
  warning: "bg-amber-100 text-amber-700",
  info: "bg-blue-100 text-blue-700",
};
const statusRank = { ACTIVE: 0, ACKNOWLEDGED: 1, RESOLVED: 2 };
const severityRank = { critical: 0, warning: 1, info: 2 };

export default function AlertsPageClient() {
  const session = useApiSession();
  const { user } = useAuth();
  const role = user?.role;
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [officers, setOfficers] = useState<MaintenanceOfficer[]>([]);
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("all");
  const [tank, setTank] = useState("all");
  const [status, setStatus] = useState("all");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [dispatchAlert, setDispatchAlert] = useState<AlertItem | null>(null);

  const load = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    try {
      const [nextAlerts, nextTanks, nextOfficers] = await Promise.all([
        getAlerts(), getTanks().catch(() => []),
        role === "ADMINISTRATOR" ? getMaintenanceOfficers().catch(() => []) : Promise.resolve([]),
      ]);
      setAlerts(nextAlerts);
      setTanks(nextTanks);
      setOfficers(nextOfficers);
      setError(null);
    } catch {
      setError("Alert history could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [role]);

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
        .some((value) => value.toLowerCase().includes(query.toLowerCase()))))
    .sort((a, b) => statusRank[a.status] - statusRank[b.status]
      || severityRank[a.severity] - severityRank[b.severity]
      || +new Date(b.created_at) - +new Date(a.created_at)),
  [alerts, severity, tank, status, date, query]);

  const acknowledge = async (alert: AlertItem) => {
    if (!user) return;
    const previous = alert;
    const now = new Date().toISOString();
    setWorkingId(alert.id);
    setAlerts((items) => items.map((item) => item.id === alert.id ? {
      ...item, status: "ACKNOWLEDGED", acknowledged_by: user.id,
      acknowledged_by_name: user.full_name, acknowledged_at: now, updated_at: now,
    } : item));
    try {
      const value = await acknowledgeAlert(alert.id);
      setAlerts((items) => items.map((item) => item.id === alert.id ? value : item));
      setFeedback({ tone: "success", message: `${value.tank_name} alert acknowledged.` });
      announceDataRefresh();
    } catch (cause) {
      setAlerts((items) => items.map((item) => item.id === alert.id ? previous : item));
      setFeedback({ tone: "error", message: apiErrorMessage(cause, "The alert could not be acknowledged.") });
    } finally { setWorkingId(null); }
  };
  const resolve = async (alert: AlertItem) => {
    setWorkingId(alert.id);
    try {
      const value = await resolveAlert(alert.id);
      setAlerts((items) => items.map((item) => item.id === alert.id ? value : item));
      setFeedback({ tone: "success", message: `${value.tank_name} alert resolved after its latest SAFE reading was verified.` });
      announceDataRefresh();
    } catch (cause) {
      setFeedback({ tone: "error", message: apiErrorMessage(cause, "The alert could not be resolved.") });
    } finally { setWorkingId(null); }
  };
  const createTask = async (value: CreateTaskValues) => {
    try {
      await createMaintenance({
        tank_id: value.tankId, task: value.task,
        scheduled_for: new Date(value.scheduledFor).toISOString(),
        assigned_to: value.officerId || null, priority: value.priority,
        status: value.officerId ? "ASSIGNED" : "SCHEDULED",
        notes: dispatchAlert ? `Created from alert ${dispatchAlert.id}.` : null,
      });
      setDispatchAlert(null);
      setFeedback({ tone: "success", message: "Maintenance task created from the alert." });
      announceDataRefresh();
    } catch (cause) {
      throw new Error(apiErrorMessage(cause, "The maintenance task could not be created."));
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
        {feedback && <div role={feedback.tone === "error" ? "alert" : "status"} className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium ${feedback.tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}><span>{feedback.message}</span><button type="button" onClick={() => setFeedback(null)} aria-label="Dismiss message" className="ml-4 text-lg">×</button></div>}
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
            <tbody className="divide-y">{filtered.map((alert) => <tr key={alert.id}
              className={alert.status === "ACTIVE" && alert.severity === "critical" ? "border-l-4 border-l-red-500 bg-red-50/60" : "hover:bg-slate-50"}>
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
              <td className="px-4 py-3"><div className="flex min-w-44 flex-col items-start gap-2">
                {user?.role === "ADMINISTRATOR" && alert.status === "ACTIVE" &&
                  <button type="button" disabled={workingId === alert.id} onClick={() => void acknowledge(alert)}
                    className="rounded-md bg-cyan-700 px-3 py-2 text-xs font-bold text-white hover:bg-cyan-800 disabled:opacity-60">
                    {workingId === alert.id ? "Acknowledging..." : "Acknowledge"}
                  </button>}
                {user?.role === "ADMINISTRATOR" && alert.status === "ACKNOWLEDGED" &&
                  <button type="button" disabled={workingId === alert.id} onClick={() => void resolve(alert)}
                    className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60">
                    {workingId === alert.id ? "Checking..." : "Resolve"}
                  </button>}
                {user?.role === "ADMINISTRATOR" && alert.status !== "RESOLVED" &&
                  <button type="button" onClick={() => setDispatchAlert(alert)}
                    className="text-left text-xs font-bold text-cyan-800 hover:underline">
                    Convert to Maintenance Task
                  </button>}
                {(user?.role !== "ADMINISTRATOR" || alert.status === "RESOLVED") && <span className="text-slate-400">-</span>}
              </div></td>
            </tr>)}
            {!filtered.length && <tr><td colSpan={8} className="p-12 text-center text-slate-500">
              No alerts match the selected filters.</td></tr>}
            </tbody>
          </table></div>
        </section>
      </div>}
    {dispatchAlert && <CreateTaskModal tanks={tanks} officers={officers}
      initialValues={{ tankId: dispatchAlert.tank_id, task: dispatchAlert.message, priority: "CRITICAL" }}
      onClose={() => setDispatchAlert(null)} onSubmit={createTask}/>}
  </ModuleScaffold>;
}
