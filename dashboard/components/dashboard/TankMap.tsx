"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { OptimizedRoute, SensorReading, Tank } from "./types";
import { isLiveReading } from "./telemetry";

interface Props { tanks: Tank[]; readings: SensorReading[]; route: OptimizedRoute | null; }
const defaultCenter: [number, number] = [0.3476, 32.5825];

function FitRoute({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => { if (points.length > 1) map.fitBounds(points, { padding: [30, 30], maxZoom: 14 }); }, [map, points]);
  return null;
}

export default function TankMap({ tanks, readings, route }: Props) {
  const mappable = tanks.filter((tank) => Number.isFinite(tank.latitude) && Number.isFinite(tank.longitude));
  const center: [number, number] = mappable.length > 0 ? [mappable[0]!.latitude, mappable[0]!.longitude] : defaultCenter;
  const routePoints: [number, number][] = route && route.stops.length > 0
    ? [[route.depot.latitude, route.depot.longitude], ...route.stops.map((stop): [number, number] => [stop.latitude, stop.longitude])]
    : [];
  return <section className="panel p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-lg font-bold text-slate-900">Live operations map</h2><p className="mt-1 text-sm text-slate-500">Tank status and optimized collection sequence.</p></div><div className="flex flex-wrap gap-3 text-[11px] text-slate-500"><span><b className="text-emerald-500">●</b> Safe</span><span><b className="text-yellow-500">●</b> Collection</span><span><b className="text-orange-500">●</b> High</span><span><b className="text-red-600">●</b> Critical</span></div></div>
    <div className="mt-5 h-[380px] overflow-hidden rounded-xl border border-slate-200">
      <MapContainer center={center} zoom={mappable.length === 1 ? 13 : 10} className="h-full w-full" scrollWheelZoom={false}>
        <TileLayer attribution={'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'} url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {routePoints.length > 1 && <><FitRoute points={routePoints} /><Polyline positions={routePoints} pathOptions={{ color: "#0891b2", weight: 5, opacity: 0.8, dashArray: "10 8" }} /><CircleMarker center={routePoints[0]!} radius={8} pathOptions={{ color: "#fff", weight: 3, fillColor: "#0f172a", fillOpacity: 1 }}><Tooltip direction="top">Collection depot</Tooltip></CircleMarker></>}
        {mappable.map((tank) => { const matchingReading = readings.find((item) => item.tank_id === tank.id); const tankReading = isLiveReading(matchingReading) ? matchingReading : null; const level = tankReading?.level; const gas = tankReading?.gas_level; const routeStop = route?.stops.find((stop) => stop.tankId === tank.id); const critical = (level??0) >= 95 || (gas??0) >= 300; const warning = !critical && ((level??0) >= 80 || (gas??0) >= 200); const status=critical?"Critical":warning?"Warning":tankReading?"Safe":"Offline"; const color = critical ? "#dc2626" : warning ? "#eab308" : tankReading ? "#16a34a" : "#64748b"; return <CircleMarker key={tank.id} center={[tank.latitude, tank.longitude]} radius={routeStop ? 14 : 11} pathOptions={{ color: "#fff", weight: 3, fillColor: color, fillOpacity: 0.95 }}>
          {routeStop && <Tooltip permanent direction="center" className="route-sequence-tooltip">{routeStop.sequence}</Tooltip>}
          <Popup><strong>{routeStop ? `${routeStop.sequence}. ` : ""}{tank.tank_name}</strong><br />Fill: {level==null?"No live data":`${level.toFixed(1)}%`}<br/>Gas: {gas==null?"No live data":`${gas.toFixed(0)} ppm`}<br/>Status: {status}<br/>Last update: {tankReading?new Date(tankReading.recorded_at).toLocaleString("en-UG"):"Unavailable"}{routeStop&&<><br/>Priority score: {routeStop.priorityScore}/100</>}<br/><Link href={`/tanks/${encodeURIComponent(tank.id)}`} className="font-semibold text-blue-700">Open tank details →</Link></Popup>
        </CircleMarker>; })}
      </MapContainer>
    </div>
    {route && route.stops.length > 0 && <p className="mt-3 text-xs text-slate-500"><span className="font-semibold text-cyan-700">Optimized route:</span> depot → {route.stops.map((stop) => stop.tankName).join(" → ")}</p>}
  </section>;
}
