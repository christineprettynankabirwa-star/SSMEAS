import type { AlertItem, MaintenanceItem } from "./types";

export default function ActivityFeed({ alerts, maintenance }: { alerts: AlertItem[]; maintenance: MaintenanceItem[] }) {
  const dotTone: Record<string, string> = { rose: "bg-rose-500", amber: "bg-amber-500", cyan: "bg-cyan-500" };
  const events = [
    ...alerts.map((item) => ({ id: `a-${item.id}`, title: item.alert_type, detail: `${item.tank_name} · ${item.message}`, date: item.created_at, tone: item.severity === "critical" ? "rose" : "amber" })),
    ...maintenance.map((item) => ({ id: `m-${item.id}`, title: item.task, detail: `${item.tank_name} · ${item.status.replaceAll("_", " ")}`, date: item.created_at, tone: "cyan" })),
  ].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 6);
  return <section className="panel-card h-full p-5"><div className="flex items-center justify-between"><div><p className="eyebrow">Operations log</p><h2 className="text-lg font-bold text-slate-950">Recent activity</h2></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">Latest</span></div><div className="mt-5">{events.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500">No recent operational events.</div> : events.map((event, index) => <article key={event.id} className="relative flex gap-3 pb-5 last:pb-0"><div className="relative z-10 mt-1"><span className={`block size-2.5 rounded-full ring-4 ring-white ${dotTone[event.tone]}`} /></div>{index < events.length - 1 && <span className="absolute left-[4px] top-3 h-full w-px bg-slate-200" />}<div className="min-w-0"><p className="text-sm font-bold text-slate-800">{event.title}</p><p className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-500">{event.detail}</p><time className="mt-1 block text-[11px] font-medium text-slate-400">{new Date(event.date).toLocaleString()}</time></div></article>)}</div></section>;
}
