import type { SensorReading, Tank } from "./types";
import { isLiveReading } from "./telemetry";

const HealthDot = ({ ok }: { ok: boolean }) => <span className={`inline-flex items-center gap-2 text-xs font-semibold ${ok ? "text-emerald-700" : "text-slate-500"}`}><span className={`size-2 rounded-full ${ok ? "bg-emerald-500" : "bg-slate-400"}`}/>{ok ? "Online" : "Offline"}</span>;

export default function DeviceHealth({ tanks, readings }: { tanks: Tank[]; readings: SensorReading[] }) {
  const readingsByTank = new Map(readings.map((reading) => [reading.tank_id, reading]));
  return <section className="panel"><div className="panel-heading"><div><h2>Device health</h2><p>Controller, network, and telemetry availability.</p></div></div><div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Tank</th><th>ESP32</th><th>Network</th><th>Last telemetry</th></tr></thead><tbody>{tanks.length === 0 ? <tr><td colSpan={4} className="text-center text-slate-500">No devices registered.</td></tr> : tanks.map((tank) => { const reading = readingsByTank.get(tank.id); const live = isLiveReading(reading); return <tr key={tank.id}><td className="font-semibold text-slate-800">{tank.tank_name}</td><td><HealthDot ok={live}/></td><td><HealthDot ok={live}/></td><td className="text-slate-600">{reading ? new Date(reading.recorded_at).toLocaleString() : "—"}</td></tr>; })}</tbody></table></div></section>;
}
