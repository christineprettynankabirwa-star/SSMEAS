import Link from "next/link";
import type { AlertItem, MaintenanceItem, SensorReading } from "./types";

export default function ActivityFeed({ reading, alerts, maintenance }: { reading: SensorReading | null; alerts: AlertItem[]; maintenance: MaintenanceItem[] }) {
  const events = [
    ...(reading ? [{ id: `r-${reading.id}`, date: reading.recorded_at, text: "New telemetry reading received", tone: "bg-slate-500", href: `/tanks/${encodeURIComponent(reading.tank_id)}` }] : []),
    ...alerts.slice(0, 3).map((alert) => ({ id: `a-${alert.id}`, date: alert.created_at, text: `${alert.alert_type} alert · ${alert.tank_name}`, tone: alert.severity === "critical" ? "bg-red-500" : "bg-amber-500", href: `/tanks/${encodeURIComponent(alert.tank_id)}` })),
    ...maintenance.slice(0, 3).map((item) => ({ id: `m-${item.id}`, date: item.created_at, text: `${item.task} · ${item.tank_name}`, tone: "bg-slate-500", href: `/tanks/${encodeURIComponent(item.tank_id)}` })),
  ].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 5);
  return <section className="panel h-full"><div className="panel-heading"><div><h2>System activity</h2><p>Latest monitoring and operations events.</p></div></div><div className="space-y-0 px-5 pb-5">{events.length === 0 ? <p className="py-5 text-sm text-slate-500">Activity will appear when data is received.</p> : events.map((event, index) => <div key={event.id} className="relative flex gap-3 pb-5 last:pb-0"><div className="relative z-10 mt-1"><span className={`block size-2.5 rounded-full ring-4 ring-white ${event.tone}`} /></div>{index < events.length - 1 && <span className="absolute left-[5px] top-3 h-full w-px bg-slate-200" />}<Link href={event.href} className="group min-w-0 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"><p className="text-sm font-medium text-slate-700 transition group-hover:text-slate-950 group-hover:underline">{event.text}</p><time className="mt-1 block text-xs text-slate-400">{new Date(event.date).toLocaleString()}</time></Link></div>)}</div></section>;
}
