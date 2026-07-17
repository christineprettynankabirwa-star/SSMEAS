"use client";
import { useRouter } from "next/navigation";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import type { Tank } from "./types";
interface Props { tanks: Tank[]; }
const defaultCenter: [number, number] = [0.3476, 32.5825];
export default function TankMap({ tanks }: Props) {
  const router = useRouter();
  const mappable = tanks.filter((tank) => Number.isFinite(tank.latitude) && Number.isFinite(tank.longitude));
  const center: [number, number] = mappable.length > 0 ? [mappable[0].latitude, mappable[0].longitude] : defaultCenter;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Tank locations</h2>
        <p className="mt-1 text-sm text-slate-500">OpenStreetMap overview of registered tanks.</p>
      </div>
      <div className="mt-5 h-72 overflow-hidden rounded-xl border border-slate-200">
        <MapContainer center={center} zoom={mappable.length === 1 ? 13 : 10} className="h-full w-full" scrollWheelZoom={false}>
          <TileLayer
            attribution={'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {mappable.map((tank) => (
            <CircleMarker
              key={tank.id}
              center={[tank.latitude, tank.longitude]}
              radius={11}
              pathOptions={{ color: "#0e7490", fillColor: "#06b6d4", fillOpacity: 0.85 }}
              eventHandlers={{ click: () => router.push(`/tanks/${encodeURIComponent(tank.id)}`) }}
            >
              <Popup><strong>{tank.tank_name}</strong><br />{tank.location}<br /><span className="font-semibold text-cyan-700">View details</span></Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </section>
  );
}
