"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import type { MaintenanceItem, MaintenanceStatus, Tank } from "@/components/dashboard/types";
import { createMaintenance, deleteMaintenance, getMaintenance, getTanks, updateMaintenance } from "@/services/api";
import { ModuleError, ModuleLoading, ModuleScaffold } from "./ModuleScaffold";
import { useApiSession } from "./useApiSession";

const officerStatuses: MaintenanceStatus[] = ["ASSIGNED", "IN_PROGRESS", "COMPLETED"];
const allStatuses: MaintenanceStatus[] = ["SCHEDULED", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

export default function MaintenancePageClient() {
  const ready = useApiSession();
  const { user } = useAuth();
  const role = user?.role;
  const [items, setItems] = useState<MaintenanceItem[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const [maintenance, availableTanks] = await Promise.all([
        getMaintenance(), role === "ADMINISTRATOR" ? getTanks() : Promise.resolve([]),
      ]);
      setItems(maintenance); setTanks(availableTanks); setError("");
    }
    catch { setError("Maintenance operations could not be loaded."); }
    finally { setLoading(false); }
  }, [role]);
  useEffect(() => {
    const id = window.setTimeout(() => { if (ready) void load(); }, 0);
    return () => window.clearTimeout(id);
  }, [ready, load]);
  const canUpdate = user?.role === "ADMINISTRATOR" || user?.role === "MAINTENANCE_OFFICER";
  const statuses = user?.role === "MAINTENANCE_OFFICER" ? officerStatuses : allStatuses;
  const update = async (item: MaintenanceItem, status: MaintenanceStatus) => {
    try {
      const changed = await updateMaintenance(item.id, { status });
      setItems((current) => current.map((value) => value.id === changed.id ? changed : value));
    } catch { setError("The task status could not be changed."); }
  };
  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    try {
      await createMaintenance({
        tank_id: String(form.get("tank")), task: String(form.get("task")),
        scheduled_for: new Date(String(form.get("date"))).toISOString(),
        priority: "HIGH",
      });
      event.currentTarget.reset(); await load();
    } catch { setError("The maintenance task could not be created."); }
  };

  return <ModuleScaffold eyebrow="Field operations" title="Maintenance"
    description={user?.role === "MAINTENANCE_OFFICER"
      ? "Your assigned work and permitted task status updates."
      : "Maintenance workload, assignments and completion history."}>
    {loading ? <ModuleLoading/> : <>
      {error && <ModuleError message={error} retry={() => void load()}/>}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          ["Assigned", items.filter((x) => x.status === "ASSIGNED").length],
          ["In progress", items.filter((x) => x.status === "IN_PROGRESS").length],
          ["Completed", items.filter((x) => x.status === "COMPLETED").length],
          ["Total", items.length],
        ].map(([label, value]) => <div key={label} className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div>)}
      </div>
      {user?.role === "ADMINISTRATOR" && <form onSubmit={create} className="mt-5 grid gap-3 rounded-2xl bg-white p-4 shadow-sm sm:grid-cols-4">
        <select required name="tank" className="rounded-lg border p-2"><option value="">Select tank</option>{tanks.map((tank)=><option key={tank.id} value={tank.id}>{tank.tank_name}</option>)}</select>
        <input required name="task" placeholder="Task description" className="rounded-lg border p-2"/>
        <input required name="date" type="datetime-local" className="rounded-lg border p-2"/>
        <button className="rounded-lg bg-cyan-700 font-bold text-white">Create task</button>
      </form>}
      <div className="mt-5 overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="min-w-[950px] w-full text-left text-sm">
          <thead className="bg-slate-50"><tr>{["Tank","Task","Priority","Officer","Scheduled","Status","Update","Action"].map((x)=><th key={x} className="p-4">{x}</th>)}</tr></thead>
          <tbody>{items.map((item)=><tr key={item.id} className="border-t">
            <td className="p-4 font-bold">{item.tank_name}</td><td className="p-4">{item.task}</td>
            <td className="p-4">{item.priority}</td><td className="p-4">{item.assigned_officer ?? "Unassigned"}</td>
            <td className="p-4">{new Date(item.scheduled_for).toLocaleString("en-UG")}</td>
            <td className="p-4">{item.status.replaceAll("_"," ")}</td>
            <td className="p-4">{canUpdate ? <select value={item.status} onChange={(e)=>void update(item,e.target.value as MaintenanceStatus)} className="rounded-lg border p-2">
              {!statuses.includes(item.status) && <option>{item.status}</option>}
              {statuses.map((status)=><option key={status}>{status}</option>)}
            </select> : "Read only"}</td>
            <td className="p-4">{user?.role === "ADMINISTRATOR" ? <button type="button" onClick={async()=>{await deleteMaintenance(item.id);await load()}} className="font-bold text-red-700">Delete</button> : "—"}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </>}
  </ModuleScaffold>;
}
