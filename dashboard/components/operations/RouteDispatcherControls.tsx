"use client";

import { useState } from "react";
import type { OptimizedRoute, RouteOptimizationRequest, RouteTankStop } from "@/components/dashboard/types";

const trucks = [
  { id: "TRUCK-01", label: "Truck 01 · 10 m³", capacity: 10_000 },
  { id: "TRUCK-02", label: "Truck 02 · 15 m³", capacity: 15_000 },
  { id: "TRUCK-03", label: "Truck 03 · 20 m³", capacity: 20_000 },
];

export default function RouteDispatcherControls({ route, busy, onRecalculate }: { route: OptimizedRoute; busy: boolean; onRecalculate: (request: RouteOptimizationRequest) => void }) {
  const tankStops = [...new Map(
    route.stops
      .filter((stop): stop is RouteTankStop => stop.stopType === "TANK")
      .map((stop) => [stop.tankId, stop]),
  ).values()];
  const [order, setOrder] = useState(tankStops.map((stop) => stop.tankId));
  const [excluded, setExcluded] = useState<string[]>([]);
  const [locked, setLocked] = useState<string[]>([]);
  const [truckId, setTruckId] = useState(route.selectedTruckId);
  const [driverId, setDriverId] = useState(route.selectedDriverId ?? "");
  const [dragged, setDragged] = useState<string | null>(null);
  const drop = (target: string) => {
    if (!dragged || dragged === target) return;
    setOrder((current) => {
      const next = current.filter((id) => id !== dragged);
      next.splice(next.indexOf(target), 0, dragged);
      return next;
    });
    setDragged(null);
  };
  const submit = () => {
    const truck = trucks.find((item) => item.id === truckId) ?? trucks[0]!;
    onRecalculate({ truckId, driverId: driverId || undefined, truckCapacityLiters: truck.capacity, excludedTankIds: excluded, preferredOrder: order, lockedTankIds: locked });
  };
  return <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end"><label className="flex-1 text-xs font-bold text-slate-600">Collection Truck<select value={truckId} onChange={(event) => setTruckId(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm">{trucks.map((truck) => <option value={truck.id} key={truck.id}>{truck.label}</option>)}</select></label><label className="flex-1 text-xs font-bold text-slate-600">Driver<select value={driverId} onChange={(event) => setDriverId(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="">Unassigned</option>{route.availableDrivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}</select></label><button type="button" onClick={submit} disabled={busy} className="h-10 rounded-lg bg-cyan-700 px-5 text-sm font-bold text-white hover:bg-cyan-800 disabled:opacity-50">{busy ? "Recalculating..." : "Recalculate Route"}</button></div>
    <div className="mt-5"><h3 className="text-sm font-bold text-slate-900">Stop controls</h3><p className="mt-1 text-xs text-slate-500">Drag stops to set a preferred order. Lock important stops or exclude tanks from this run.</p><div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{order.map((id) => { const stop = tankStops.find((item) => item.tankId === id)!; return <div key={id} draggable onDragStart={() => setDragged(id)} onDragOver={(event) => event.preventDefault()} onDrop={() => drop(id)} className={`flex items-center gap-2 rounded-lg border p-2 ${excluded.includes(id) ? "border-slate-200 bg-slate-100 opacity-55" : "border-slate-300 bg-white"}`}><span title="Drag to reorder" className="cursor-grab px-1 text-slate-400">⋮⋮</span><span className="min-w-0 flex-1 truncate text-xs font-semibold">{stop.tankName}</span><label className="flex items-center gap-1 text-[10px] text-slate-600"><input type="checkbox" checked={locked.includes(id)} onChange={() => setLocked((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])} /> Lock</label><label className="flex items-center gap-1 text-[10px] text-red-700"><input type="checkbox" checked={excluded.includes(id)} onChange={() => setExcluded((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])} /> Exclude</label></div>; })}</div></div>
  </section>;
}
