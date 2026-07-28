"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { OptimizedRoute, RouteFacilityStop, RouteTankStop, SensorReading, Tank } from "./types";
import { isLiveReading } from "./telemetry";
import { classifyLevel } from "@/services/alert-thresholds";

interface Props { tanks: Tank[]; readings: SensorReading[]; route: OptimizedRoute | null; focusTankId?: string | null; focusZoom?: number; }
const defaultCenter: [number, number] = [0.3476, 32.5825];

function FitRoute({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => { if (points.length > 1) map.fitBounds(points, { padding: [30, 30], maxZoom: 14 }); }, [map, points]);
  return null;
}
function FocusTank({ tank, zoom }: { tank: Tank | undefined; zoom: number }) {
  const map = useMap();
  useEffect(() => { if (tank) map.setView([tank.latitude, tank.longitude], zoom, { animate: true }); }, [map, tank, zoom]);
  return null;
}

export default function TankMap({ tanks, readings, route, focusTankId = null, focusZoom = 17 }: Props) {
  const mappable = tanks.filter((tank) => Number.isFinite(tank.latitude) && Number.isFinite(tank.longitude));
  const center: [number, number] = mappable.length ? [mappable[0]!.latitude, mappable[0]!.longitude] : defaultCenter;
  const tankStops = route?.stops.filter((stop): stop is RouteTankStop => stop.stopType === "TANK") ?? [];
  const routePoints = route?.roadGeometry?.length
    ? route.roadGeometry
    : route ? [[route.depot.latitude, route.depot.longitude] as [number, number], ...route.stops.map((stop): [number, number] => [stop.latitude, stop.longitude])] : [];
  return <section className="panel p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-lg font-bold text-slate-900">Live operations map</h2><p className="mt-1 text-sm text-slate-500">Road-following collection route and live tank status.</p></div><div className="flex flex-wrap gap-3 text-[11px] text-slate-500"><span><b className="text-emerald-500">●</b> Safe</span><span><b className="text-yellow-500">●</b> Collection</span><span><b className="text-orange-500">●</b> High</span><span><b className="text-red-600">●</b> Critical</span></div></div>
    <div className="mt-5 h-[480px] overflow-hidden rounded-xl border border-slate-200">
      <MapContainer center={center} zoom={mappable.length === 1 ? 13 : 10} className="h-full w-full" scrollWheelZoom={false}>
        <TileLayer attribution={'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'} url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FocusTank tank={mappable.find((tank) => tank.id === focusTankId)} zoom={focusZoom} />
        {routePoints.length > 1 && <><FitRoute points={routePoints} /><Polyline positions={routePoints} pathOptions={{ color: "#0891b2", weight: 5, opacity: 0.85 }} /><CircleMarker center={[route!.depot.latitude, route!.depot.longitude]} radius={8} pathOptions={{ color: "#fff", weight: 3, fillColor: "#0f172a", fillOpacity: 1 }}><Tooltip direction="top">Collection depot</Tooltip></CircleMarker></>}
        {route?.stops.filter((stop): stop is RouteFacilityStop => stop.stopType === "DISPOSAL").map((stop) => <CircleMarker key={`disposal-${stop.sequence}`} center={[stop.latitude, stop.longitude]} radius={10} pathOptions={{ color: "#fff", weight: 3, fillColor: "#7c3aed", fillOpacity: 1 }}><Tooltip direction="top">{stop.sequence}. {stop.name}</Tooltip></CircleMarker>)}
        {mappable.map((tank) => {
          const matchingReading = readings.find((item) => item.tank_id === tank.id);
          const tankReading = isLiveReading(matchingReading) ? matchingReading : null;
          const level = tankReading?.level; const gas = tankReading?.gas_level;
          const routeStop = tankStops.find((stop) => stop.tankId === tank.id);
          const focused = tank.id === focusTankId;
          const condition = tankReading ? classifyLevel(level) : "OFFLINE";
          const status = condition === "DANGER" ? "Critical" : condition === "WARNING" ? "Warning" : condition === "SAFE" ? "Safe" : "Offline";
          const color = condition === "DANGER" ? "#dc2626" : condition === "WARNING" ? "#eab308" : condition === "SAFE" ? "#16a34a" : "#64748b";
          return <CircleMarker key={tank.id} center={[tank.latitude, tank.longitude]} radius={focused ? 20 : routeStop ? 14 : 11} pathOptions={{ color: focused ? "#7f1d1d" : "#fff", weight: focused ? 7 : 3, fillColor: color, fillOpacity: 0.95, dashArray: focused ? "8 5" : undefined }}>
            {routeStop && <Tooltip permanent direction="center" className="route-sequence-tooltip">{routeStop.sequence}</Tooltip>}
            <Popup><strong>{routeStop ? `${routeStop.sequence}. ` : ""}{tank.tank_name}</strong><br />Fill: {level == null ? "No live data" : `${level.toFixed(1)}%`}<br />Gas: {gas == null ? "No live data" : `${gas.toFixed(0)} ppm`}<br />Status: {status}<br />Last update: {tankReading ? new Date(tankReading.recorded_at).toLocaleString("en-UG") : "Unavailable"}{routeStop && <><br />Urgency: {routeStop.priorityScore}/100<br />Estimated pickup: {routeStop.estimatedCollectionLiters.toLocaleString()} L</>}<br /><Link href={`/tanks/${encodeURIComponent(tank.id)}`} className="font-semibold text-blue-700">Open tank details →</Link></Popup>
          </CircleMarker>;
        })}
      </MapContainer>
    </div>
    {route && tankStops.length > 0 && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><p><span className="font-semibold text-cyan-700">Route:</span> depot → {route.stops.map((stop) => stop.stopType === "TANK" ? stop.tankName : stop.name).join(" → ")}</p><span className={`rounded-full px-2 py-1 font-bold ${route.routingSource === "OSRM" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{route.routingSource === "OSRM" ? "Live road network" : "Offline fallback"}</span></div>}
  </section>;
}
