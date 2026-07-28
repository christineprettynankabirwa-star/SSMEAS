"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import type { MaintenanceItem, MaintenanceOfficer, MaintenanceStatus, Tank } from "@/components/dashboard/types";
import { createMaintenance, deleteMaintenance, getMaintenance, getMaintenanceOfficers, getTanks, updateMaintenance } from "@/services/api";
import { apiErrorMessage } from "@/components/admin/userManagement";
import ConfirmTaskDeleteModal from "@/components/maintenance/ConfirmTaskDeleteModal";
import CreateTaskModal, { type CreateTaskValues } from "@/components/maintenance/CreateTaskModal";
import { ModuleLoading, ModuleScaffold } from "./ModuleScaffold";
import { useApiSession } from "./useApiSession";

type Filter = "ALL" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";
const officerStatuses: MaintenanceStatus[] = ["ASSIGNED", "IN_PROGRESS", "COMPLETED"];
const allStatuses: MaintenanceStatus[] = ["SCHEDULED", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
const statusTone: Record<MaintenanceStatus, string> = {
  SCHEDULED: "border-blue-200 bg-blue-50 text-blue-700",
  ASSIGNED: "border-cyan-200 bg-cyan-50 text-cyan-800",
  IN_PROGRESS: "border-amber-200 bg-amber-50 text-amber-800",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CANCELLED: "border-slate-200 bg-slate-100 text-slate-600",
};
const priorityTone = {
  CRITICAL: "bg-red-50 text-red-700", HIGH: "bg-orange-50 text-orange-700",
  MEDIUM: "bg-amber-50 text-amber-800", LOW: "bg-slate-100 text-slate-600",
};

export default function MaintenancePageClient() {
  const ready = useApiSession();
  const { user } = useAuth();
  const role = user?.role;
  const [items, setItems] = useState<MaintenanceItem[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [officers, setOfficers] = useState<MaintenanceOfficer[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleting, setDeleting] = useState<MaintenanceItem | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [maintenance, availableTanks, availableOfficers] = await Promise.all([
        getMaintenance(),
        role === "ADMINISTRATOR" ? getTanks() : Promise.resolve([]),
        role === "ADMINISTRATOR" ? getMaintenanceOfficers() : Promise.resolve([]),
      ]);
      setItems(maintenance); setTanks(availableTanks); setOfficers(availableOfficers); setFeedback(null);
    } catch (error) {
      setFeedback({ tone: "error", message: apiErrorMessage(error, "Maintenance operations could not be loaded.") });
    } finally { setLoading(false); }
  }, [role]);
  useEffect(() => {
    const id = window.setTimeout(() => { if (ready) void load(); }, 0);
    return () => window.clearTimeout(id);
  }, [ready, load]);

  const counters = useMemo(() => ({
    assigned: items.filter((item) => Boolean(item.assigned_to) && ["SCHEDULED", "ASSIGNED"].includes(item.status)).length,
    inProgress: items.filter((item) => item.status === "IN_PROGRESS").length,
    completed: items.filter((item) => item.status === "COMPLETED").length,
    total: items.length,
  }), [items]);
  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesFilter = filter === "ALL"
        || (filter === "SCHEDULED" && ["SCHEDULED", "ASSIGNED"].includes(item.status))
        || item.status === filter;
      const matchesQuery = !normalized || [item.tank_name, item.task, item.assigned_officer ?? "unassigned"]
        .some((value) => value.toLowerCase().includes(normalized));
      return matchesFilter && matchesQuery;
    });
  }, [filter, items, query]);

  const canUpdate = role === "ADMINISTRATOR" || role === "MAINTENANCE_OFFICER";
  const statuses = role === "MAINTENANCE_OFFICER" ? officerStatuses : allStatuses;
  const updateStatus = async (item: MaintenanceItem, status: MaintenanceStatus) => {
    if (["IN_PROGRESS", "COMPLETED"].includes(status) && !item.assigned_to) {
      setFeedback({ tone: "error", message: "Assign a maintenance officer before starting or completing this task." });
      return;
    }
    setUpdatingId(item.id);
    try {
      const changed = await updateMaintenance(item.id, { status });
      setItems((current) => current.map((value) => value.id === changed.id ? changed : value));
      setFeedback({ tone: "success", message: `${changed.tank_name} task moved to ${changed.status.replaceAll("_", " ").toLowerCase()}.` });
    } catch (error) {
      setFeedback({ tone: "error", message: apiErrorMessage(error, "The task status could not be changed.") });
    } finally { setUpdatingId(null); }
  };
  const createTask = async (value: CreateTaskValues) => {
    try {
      const created = await createMaintenance({
        tank_id: value.tankId, task: value.task,
        scheduled_for: new Date(value.scheduledFor).toISOString(),
        assigned_to: value.officerId || null,
        priority: value.priority,
        status: value.officerId ? "ASSIGNED" : "SCHEDULED",
      });
      setItems((current) => [...current, created].sort((a, b) => +new Date(a.scheduled_for) - +new Date(b.scheduled_for)));
      setCreateOpen(false);
      setFeedback({ tone: "success", message: "Maintenance task created successfully." });
    } catch (error) {
      throw new Error(apiErrorMessage(error, "The maintenance task could not be created."));
    }
  };
  const removeTask = async () => {
    if (!deleting) return;
    await deleteMaintenance(deleting.id);
    const name = deleting.task;
    setItems((current) => current.filter((item) => item.id !== deleting.id));
    setDeleting(null);
    setFeedback({ tone: "success", message: `${name} was deleted.` });
  };

  return <ModuleScaffold eyebrow="Field operations" title="Maintenance"
    description={role === "MAINTENANCE_OFFICER" ? "Your assigned work and permitted task status updates." : "Operational workload, dispatch assignments, and completion history."}
    actions={role === "ADMINISTRATOR" ? <button type="button" onClick={() => setCreateOpen(true)} className="h-10 rounded-lg bg-cyan-700 px-5 text-sm font-bold text-white hover:bg-cyan-800">+ Create Task</button> : undefined}>
    {loading ? <ModuleLoading /> : <div className="space-y-5">
      {feedback && <div role={feedback.tone === "error" ? "alert" : "status"} className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium ${feedback.tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}><span>{feedback.message}</span><button type="button" onClick={() => setFeedback(null)} aria-label="Dismiss message" className="ml-4 text-lg">×</button></div>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
        ["Assigned", counters.assigned], ["In Progress", counters.inProgress],
        ["Completed", counters.completed], ["Total", counters.total],
      ].map(([label, value]) => <div key={label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-2 text-3xl font-black text-slate-900">{value}</p></div>)}</div>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div role="tablist" aria-label="Maintenance status filters" className="flex overflow-x-auto rounded-lg bg-slate-100 p-1">{([
            ["ALL", "All Tasks"], ["SCHEDULED", "Scheduled"], ["IN_PROGRESS", "In Progress"], ["COMPLETED", "Completed"],
          ] as Array<[Filter, string]>).map(([key, label]) => <button role="tab" aria-selected={filter === key} type="button" key={key} onClick={() => setFilter(key)} className={`h-9 whitespace-nowrap rounded-md px-3 text-xs font-bold ${filter === key ? "bg-white text-cyan-800 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>{label}</button>)}</div>
          <label className="relative block w-full lg:w-80"><span className="sr-only">Search maintenance tasks</span><span aria-hidden="true" className="absolute inset-y-0 left-3 flex items-center text-slate-400">⌕</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tank, task, or officer" className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100" /></label>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600"><tr>{["Tank", "Task", "Priority", "Officer", "Scheduled", "Status", "Actions"].map((heading) => <th key={heading} className={`px-5 py-3 font-semibold ${heading === "Actions" ? "text-right" : ""}`}>{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-200">{visible.map((item) => <tr key={item.id} className="hover:bg-slate-50">
          <td className="px-5 py-4 font-semibold text-slate-900">{item.tank_name}</td><td className="max-w-xs px-5 py-4 text-slate-700">{item.task}</td>
          <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${priorityTone[item.priority]}`}>{item.priority}</span></td>
          <td className="px-5 py-4 text-slate-600">{item.assigned_officer ?? "Unassigned"}</td><td className="whitespace-nowrap px-5 py-4 text-slate-600">{new Date(item.scheduled_for).toLocaleString("en-UG")}</td>
          <td className="px-5 py-4">{canUpdate ? <select aria-label={`Update status for ${item.task}`} value={item.status} disabled={updatingId === item.id} onChange={(event) => void updateStatus(item, event.target.value as MaintenanceStatus)} className={`rounded-full border px-2.5 py-1 text-xs font-bold outline-none ${statusTone[item.status]}`}>{!statuses.includes(item.status) && <option value={item.status}>{item.status.replaceAll("_", " ")}</option>}{statuses.map((status) => <option key={status} value={status} disabled={!item.assigned_to && ["IN_PROGRESS", "COMPLETED"].includes(status)}>{status.replaceAll("_", " ")}</option>)}</select> : <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusTone[item.status]}`}>{item.status.replaceAll("_", " ")}</span>}</td>
          <td className="px-5 py-4 text-right">{role === "ADMINISTRATOR" ? <button type="button" onClick={() => setDeleting(item)} title={`Delete ${item.task}`} aria-label={`Delete ${item.task}`} className="h-9 w-9 rounded-md border border-red-200 text-base text-red-700 hover:bg-red-50">🗑</button> : <span className="text-slate-400">—</span>}</td>
        </tr>)}</tbody></table>{visible.length === 0 && <div className="px-5 py-14 text-center"><p className="font-semibold text-slate-700">No maintenance tasks found</p><p className="mt-1 text-sm text-slate-500">Adjust the status filter or search query.</p></div>}</div>
      </section>
    </div>}
    {createOpen && <CreateTaskModal tanks={tanks} officers={officers} onClose={() => setCreateOpen(false)} onSubmit={createTask} />}
    {deleting && <ConfirmTaskDeleteModal item={deleting} onClose={() => setDeleting(null)} onConfirm={removeTask} />}
  </ModuleScaffold>;
}
