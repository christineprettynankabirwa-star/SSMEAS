import type { AlertItem, MaintenanceItem, SensorReading } from "./types";
export default function ActivityFeed({ reading, alerts, maintenance }: { reading: SensorReading | null; alerts: AlertItem[]; maintenance: MaintenanceItem[] }) {
  const events = [
    ...(reading ? [{ id: `r-${reading.id}`, date: reading.recorded_at, text: "New telemetry reading received", tone: "bg-blue-500" }] : []),
    ...alerts.slice(0, 3).map(a => ({ id: `a-${a.id}`, date: a.created_at, text: `${a.alert_type} alert · ${a.tank_name}`, tone: a.severity === "critical" ? "bg-red-500" : "bg-amber-500" })),
    ...maintenance.slice(0, 3).map(m => ({ id: `m-${m.id}`, date: m.created_at, text: `${m.task} · ${m.tank_name}`, tone: "bg-emerald-500" })),
  ].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 5);
  return <section className="panel"><div className="panel-heading"><div><h2>System activity</h2><p>Latest monitoring and operations events.</p></div></div><div className="space-y-0 px-5 pb-5">{events.length === 0 ? <p className="py-5 text-sm text-slate-500">Activity will appear when data is received.</p> : events.map((event, i) => <div key={event.id} className="relative flex gap-3 pb-5 last:pb-0"><div className="relative z-10 mt-1"><span className={`block size-2.5 rounded-full ring-4 ring-white ${event.tone}`} /></div>{i < events.length - 1 && <span className="absolute left-[5px] top-3 h-full w-px bg-slate-200" />}<div><p className="text-sm font-medium text-slate-700">{event.text}</p><time className="mt-1 block text-xs text-slate-400">{new Date(event.date).toLocaleString()}</time></div></div>)}</div></section>;
}
