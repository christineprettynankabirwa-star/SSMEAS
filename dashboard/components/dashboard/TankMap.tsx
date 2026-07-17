"use client";
import { useRouter } from "next/navigation";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import type { SensorReading, Tank } from "./types";
interface Props { tanks: Tank[]; reading: SensorReading | null; }
const defaultCenter: [number, number] = [0.3476, 32.5825];
export default function TankMap({ tanks, reading }: Props) {
  const router = useRouter();
  const mappable = tanks.filter((tank) => Number.isFinite(tank.latitude) && Number.isFinite(tank.longitude));
  const center: [number, number] = mappable.length > 0 ? [mappable[0].latitude, mappable[0].longitude] : defaultCenter;
  return (
    <section className="panel p-5">
      <div className="flex items-start justify-between"><div><h2 className="text-lg font-bold text-slate-900">Live operations map</h2><p className="mt-1 text-sm text-slate-500">Tank locations and current reporting status.</p></div><div className="flex gap-3 text-[11px] text-slate-500"><span><b className="text-green-500">●</b> Safe</span><span><b className="text-amber-500">●</b> Warning</span><span><b className="text-red-500">●</b> Critical</span></div></div>
      <div className="mt-5 h-[340px] overflow-hidden rounded-xl border border-slate-200">
        <MapContainer center={center} zoom={mappable.length === 1 ? 13 : 10} className="h-full w-full" scrollWheelZoom={false}>
          <TileLayer
            attribution={'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {mappable.map((tank) => { const tankReading = reading?.tank_id === tank.id ? reading : null; const level = tankReading?.level; const critical = level != null && level >= 95; const warning = !critical && level != null && level >= 80; const color = critical ? "#dc2626" : warning ? "#d97706" : tankReading ? "#16a34a" : "#64748b"; return (
            <CircleMarker
              key={tank.id}
              center={[tank.latitude, tank.longitude]}
              radius={11}
              pathOptions={{ color: "#fff", weight: 3, fillColor: color, fillOpacity: 0.95 }}
              eventHandlers={{ click: () => router.push(`/tanks/${encodeURIComponent(tank.id)}`) }}
            >
              <Popup><strong>{tank.tank_name}</strong><br />{tank.location}<br />Fill: {level == null ? "No live data" : `${level.toFixed(1)}%`}<br />Gas: {tankReading?.gas_level == null ? "—" : `${tankReading.gas_level.toFixed(0)} ppm`}<br /><span className="font-semibold text-blue-700">View details</span></Popup>
            </CircleMarker>
          ); })}
        </MapContainer>
      </div>
    </section>
  );
}
