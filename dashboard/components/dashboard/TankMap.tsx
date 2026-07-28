"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import L, { type Map as LeafletMap, type Marker as LeafletMarker } from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { OptimizedRoute, RouteFacilityStop, RouteTankStop, SensorReading, Tank } from "./types";
import { isLiveReading } from "./telemetry";
import { classifyLevel, type TankCondition } from "@/services/alert-thresholds";

interface Props {
  tanks: Tank[];
  readings: SensorReading[];
  route: OptimizedRoute | null;
  focusTankId?: string | null;
  focusZoom?: number;
  operationalControls?: boolean;
}
type DisplayStatus = "SAFE" | "COLLECTION" | "HIGH" | "CRITICAL" | "OFFLINE";
type StatusFilter = "ALL" | "CRITICAL" | "HIGH" | "SAFE";
interface TankView {
  tank: Tank;
  reading: SensorReading | null;
  routeStop?: RouteTankStop;
  status: DisplayStatus;
}

const defaultCenter: [number, number] = [0.3476, 32.5825];
const pinColors: Record<DisplayStatus, string> = {
  SAFE: "#16a34a", COLLECTION: "#eab308", HIGH: "#f97316",
  CRITICAL: "#dc2626", OFFLINE: "#64748b",
};
const statusFrom = (condition: TankCondition, routeStop?: RouteTankStop): DisplayStatus => {
  if (condition === "DANGER") return "CRITICAL";
  if (condition === "WARNING") return "HIGH";
  if (routeStop) return "COLLECTION";
  return condition;
};
const pinIcon = (status: DisplayStatus, focused: boolean) => L.divIcon({
  className: "tank-pin-wrapper",
  html: `<svg width="30" height="40" viewBox="0 0 30 40" aria-hidden="true">
    <path d="M15 1C7.4 1 1.5 6.8 1.5 14.1c0 10.2 13.5 24.4 13.5 24.4s13.5-14.2 13.5-24.4C28.5 6.8 22.6 1 15 1Z"
      fill="${pinColors[status]}" stroke="${focused ? "#0f172a" : "#fff"}" stroke-width="${focused ? 3 : 2}"/>
    <circle cx="15" cy="14" r="5.2" fill="#fff"/>
  </svg>`,
  iconSize: [30, 40],
  iconAnchor: [15, 39],
  popupAnchor: [0, -35],
});

function MapViewport({ points, focusTank, focusZoom, routeActive }: {
  points: [number, number][]; focusTank?: Tank; focusZoom: number; routeActive: boolean;
}) {
  const map = useMap();
  const pointKey = points.map(([lat, lng]) => `${lat},${lng}`).join("|");
  useEffect(() => {
    if (focusTank) {
      map.setView([focusTank.latitude, focusTank.longitude], focusZoom, { animate: true });
    } else if (!routeActive && points.length) {
      map.fitBounds(points, { padding: [45, 45], maxZoom: 16 });
    } else if (!routeActive) {
      map.setView(defaultCenter, 14);
    }
  }, [map, pointKey, points, focusTank, focusZoom, routeActive]);
  return null;
}
function FitRoute({ points }: { points: [number, number][] }) {
  const map = useMap();
  const pointKey = points.map(([lat, lng]) => `${lat},${lng}`).join("|");
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [30, 30], maxZoom: 14 });
  }, [map, pointKey, points]);
  return null;
}
function MapLegend() {
  const map = useMap();
  useEffect(() => {
    const legend = new L.Control({ position: "bottomleft" });
    legend.onAdd = () => {
      const element = L.DomUtil.create("div", "tank-map-legend leaflet-control");
      element.innerHTML = ([
        ["#16a34a", "Safe"], ["#eab308", "Collection"],
        ["#f97316", "High"], ["#dc2626", "Critical"],
      ] as const).map(([color, label]) =>
        `<span><i style="background:${color}"></i>${label}</span>`).join("");
      L.DomEvent.disableClickPropagation(element);
      return element;
    };
    legend.addTo(map);
    return () => { legend.remove(); };
  }, [map]);
  return null;
}

export default function TankMap({
  tanks, readings, route, focusTankId = null, focusZoom = 17, operationalControls = false,
}: Props) {
  const [map, setMap] = useState<LeafletMap | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const markerRefs = useRef(new Map<string, LeafletMarker>());
  const mappable = useMemo(() => tanks.filter((tank) =>
    tank.status !== "INACTIVE"
    && Number.isFinite(tank.latitude) && Number.isFinite(tank.longitude)), [tanks]);
  const tankStops = useMemo(() =>
    route?.stops.filter((stop): stop is RouteTankStop => stop.stopType === "TANK") ?? [], [route]);
  const routePoints = useMemo<[number, number][]>(() => route?.roadGeometry?.length
    ? route.roadGeometry
    : route ? [[route.depot.latitude, route.depot.longitude], ...route.stops.map((stop) => [stop.latitude, stop.longitude] as [number, number])] : [],
  [route]);
  const views = useMemo<TankView[]>(() => mappable.map((tank) => {
    const candidate = readings.find((reading) => reading.tank_id === tank.id);
    const reading = candidate && isLiveReading(candidate) ? candidate : null;
    const routeStop = tankStops.find((stop) => stop.tankId === tank.id);
    return { tank, reading, routeStop, status: statusFrom(reading ? classifyLevel(reading.level) : "OFFLINE", routeStop) };
  }), [mappable, readings, tankStops]);
  const visibleViews = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return views.filter(({ tank, status }) =>
      (filter === "ALL" || status === filter)
      && (!normalized || tank.tank_name.toLowerCase().includes(normalized)
        || tank.id.toLowerCase().includes(normalized)
        || tank.location.toLowerCase().includes(normalized)));
  }, [filter, query, views]);
  const tankPoints = useMemo<[number, number][]>(
    () => mappable.map((tank) => [tank.latitude, tank.longitude]), [mappable]);
  const focusTank = mappable.find((tank) => tank.id === focusTankId);
  const recenter = () => {
    if (!map) return;
    if (tankPoints.length) map.fitBounds(tankPoints, { padding: [45, 45], maxZoom: 16 });
    else map.setView(defaultCenter, 14);
  };
  const locate = (tank: Tank) => {
    if (!map) return;
    map.flyTo([tank.latitude, tank.longitude], 16, { duration: 0.8 });
    window.setTimeout(() => markerRefs.current.get(tank.id)?.openPopup(), 850);
  };

  return <section className="panel p-5">
    <div><h2 className="text-lg font-bold text-slate-900">{operationalControls ? "Tank GIS map" : "Live operations map"}</h2><p className="mt-1 text-sm text-slate-500">Road-following collection route and live tank status.</p></div>
    <div className={`relative mt-5 overflow-hidden rounded-lg border border-slate-200 ${operationalControls ? "h-[680px]" : "h-[480px]"}`}>
      <MapContainer ref={setMap} center={defaultCenter} zoom={14} minZoom={10}
        maxZoom={19} className="h-full w-full" scrollWheelZoom>
        <TileLayer attribution={'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'} url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapViewport points={tankPoints} focusTank={focusTank} focusZoom={focusZoom} routeActive={routePoints.length > 1} />
        <MapLegend />
        {routePoints.length > 1 && <><FitRoute points={routePoints}/><Polyline positions={routePoints} pathOptions={{ color: "#0891b2", weight: 5, opacity: 0.85 }}/><CircleMarker center={[route!.depot.latitude, route!.depot.longitude]} radius={8} pathOptions={{ color: "#fff", weight: 3, fillColor: "#0f172a", fillOpacity: 1 }}><Tooltip direction="top">Collection depot</Tooltip></CircleMarker></>}
        {route?.stops.filter((stop): stop is RouteFacilityStop => stop.stopType === "DISPOSAL").map((stop) => <CircleMarker key={`disposal-${stop.sequence}`} center={[stop.latitude, stop.longitude]} radius={10} pathOptions={{ color: "#fff", weight: 3, fillColor: "#7c3aed", fillOpacity: 1 }}><Tooltip direction="top">{stop.sequence}. {stop.name}</Tooltip></CircleMarker>)}
        <MarkerClusterGroup chunkedLoading showCoverageOnHover={false} maxClusterRadius={45}>
          {visibleViews.map(({ tank, reading, routeStop, status }) => {
            const level = reading?.level;
            const gas = reading?.gas_level;
            return <Marker key={tank.id} position={[tank.latitude, tank.longitude]}
              icon={pinIcon(status, tank.id === focusTankId)}
              ref={(marker) => { if (marker) markerRefs.current.set(tank.id, marker); else markerRefs.current.delete(tank.id); }}>
              <Popup>
                <div className="min-w-52 space-y-1">
                  <strong className="block text-sm">{routeStop ? `${routeStop.sequence}. ` : ""}{tank.tank_name}</strong>
                  <span className="block text-xs text-slate-500">{tank.location}</span>
                  <span className="block">Sewage level: {level == null ? "No live data" : `${level.toFixed(1)}%`}</span>
                  <span className="block">Gas status: {gas == null ? "No live data" : `${gas.toFixed(0)} ppm`}</span>
                  <span className="block">Last updated: {reading ? new Date(reading.recorded_at).toLocaleString("en-UG") : "Unavailable"}</span>
                  <span className="block">Status: {status.charAt(0) + status.slice(1).toLowerCase()}</span>
                  <Link href={`/tanks/${encodeURIComponent(tank.id)}`} className="mt-2 inline-block rounded-md bg-cyan-700 px-3 py-2 font-semibold text-white">View Tank Details</Link>
                </div>
              </Popup>
            </Marker>;
          })}
        </MarkerClusterGroup>
      </MapContainer>
      {operationalControls && <>
        <button type="button" onClick={() => setDrawerOpen((current) => !current)}
          aria-label={drawerOpen ? "Collapse asset drawer" : "Open asset drawer"}
          className="absolute left-3 top-3 z-[800] grid h-10 w-10 place-items-center rounded-md border border-slate-200 bg-white text-lg font-bold text-slate-700 shadow-lg">
          {drawerOpen ? "‹" : "›"}
        </button>
        {drawerOpen && <aside className="absolute bottom-3 left-3 top-16 z-[750] flex w-[min(22rem,calc(100%-1.5rem))] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="space-y-3 border-b border-slate-200 p-4">
            <div className="flex items-center justify-between"><h3 className="font-bold text-slate-900">Assets</h3><button type="button" onClick={recenter} className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-bold text-slate-700">Recenter Map</button></div>
            <label className="block"><span className="sr-only">Search tanks</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tank name or ID" className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"/></label>
            <div className="flex gap-1 overflow-x-auto">{(["ALL", "CRITICAL", "HIGH", "SAFE"] as const).map((value) => <button type="button" key={value} onClick={() => setFilter(value)} className={`rounded-md px-2.5 py-1.5 text-[11px] font-bold ${filter === value ? "bg-cyan-700 text-white" : "bg-slate-100 text-slate-600"}`}>{value.charAt(0) + value.slice(1).toLowerCase()}</button>)}</div>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3">{visibleViews.map(({ tank, reading, status }) => <button type="button" key={tank.id} onClick={() => locate(tank)} className="flex w-full items-start gap-3 rounded-md border border-slate-200 p-3 text-left hover:border-cyan-300 hover:bg-cyan-50">
            <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: pinColors[status] }}/>
            <span className="min-w-0"><strong className="block truncate text-sm text-slate-900">{tank.tank_name}</strong><span className="block truncate text-xs text-slate-500">{tank.location} · {reading?.level == null ? "No live level" : `${reading.level.toFixed(1)}%`}</span></span>
          </button>)}{visibleViews.length === 0 && <p className="p-5 text-center text-sm text-slate-500">No tanks match these filters.</p>}</div>
        </aside>}
      </>}
    </div>
    {route && tankStops.length > 0 && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><p><span className="font-semibold text-cyan-700">Route:</span> depot → {route.stops.map((stop) => stop.stopType === "TANK" ? stop.tankName : stop.name).join(" → ")}</p><span className={`rounded-full px-2 py-1 font-bold ${route.routingSource === "OSRM" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{route.routingSource === "OSRM" ? "Live road network" : "Offline fallback"}</span></div>}
  </section>;
}
