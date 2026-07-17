interface Props { totalTanks: number; onlineTanks: number; activeAlerts: number; averageFillLevel: number | null; activeJobs: number; }
const icons = ["▦", "●", "!", "≈", "✓"];
export default function SummaryCards(props: Props) {
  const items = [
    { label: "Total tanks", value: props.totalTanks, color: "text-blue-700", bg: "bg-blue-50" },
    { label: "Online", value: props.onlineTanks, color: "text-emerald-700", bg: "bg-emerald-50" },
    { label: "Active alerts", value: props.activeAlerts, color: props.activeAlerts ? "text-red-700" : "text-emerald-700", bg: props.activeAlerts ? "bg-red-50" : "bg-emerald-50" },
    { label: "Average fill", value: props.averageFillLevel == null ? "—" : `${props.averageFillLevel.toFixed(0)}%`, color: "text-amber-700", bg: "bg-amber-50" },
    { label: "Open jobs", value: props.activeJobs, color: "text-indigo-700", bg: "bg-indigo-50" },
  ];
  return <section aria-label="System overview" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">{items.map((item, i) => <article key={item.label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><span className={`grid size-10 shrink-0 place-items-center rounded-lg text-lg font-black ${item.bg} ${item.color}`} aria-hidden="true">{icons[i]}</span><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p><p className={`mt-0.5 text-2xl font-extrabold ${item.color}`}>{item.value}</p></div></article>)}</section>;
}
