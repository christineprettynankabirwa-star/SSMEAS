import AnimatedValue from "@/components/ui/AnimatedValue";
import MetricCard from "@/components/ui/MetricCard";

interface Props { totalTanks: number; onlineTanks: number; activeAlerts: number; averageFillLevel: number | null; activeJobs: number; }
const Icon = ({ path }: { path: string }) => <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={path}/></svg>;

export default function SummaryCards(props: Props) {
  const onlineRate = props.totalTanks ? Math.round(props.onlineTanks / props.totalTanks * 100) : 0;
  const items = [
    { label: "Registered assets", value: <AnimatedValue value={props.totalTanks}/>, detail: "tanks monitored", tone: "bg-blue-50 text-blue-700", line: "bg-blue-500", icon: <Icon path="M5 21V4h14v17M8 8h2m4 0h2M8 12h2m4 0h2M10 21v-4h4v4"/> },
    { label: "Network online", value: <AnimatedValue value={props.onlineTanks}/>, detail: `${onlineRate}% reporting`, tone: "bg-emerald-50 text-emerald-700", line: "bg-emerald-500", icon: <Icon path="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19h.01"/> },
    { label: "Priority alerts", value: <AnimatedValue value={props.activeAlerts}/>, detail: props.activeAlerts ? "needs attention" : "network clear", tone: props.activeAlerts ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700", line: props.activeAlerts ? "bg-red-500" : "bg-emerald-500", icon: <Icon path="M12 3 3.5 19h17L12 3Zm0 6v4m0 3h.01"/> },
    { label: "Average fill", value: props.averageFillLevel == null ? "—" : <AnimatedValue value={props.averageFillLevel} suffix="%"/>, detail: "across network", tone: "bg-amber-50 text-amber-700", line: "bg-amber-500", icon: <Icon path="M5 4v14a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V4M5 13c2-1.5 4 1.5 7 0s5 1.5 7 0"/> },
    { label: "Open work orders", value: <AnimatedValue value={props.activeJobs}/>, detail: props.activeJobs === 1 ? "active job" : "active jobs", tone: "bg-indigo-50 text-indigo-700", line: "bg-indigo-500", icon: <Icon path="M4 7h16v13H4V7Zm5 0V4h6v3m-6 6 2 2 4-4"/> },
  ];
  return <section aria-labelledby="network-summary-title"><div className="mb-3 flex items-end justify-between"><div><h2 id="network-summary-title" className="text-sm font-bold text-slate-900">Network at a glance</h2><p className="text-xs text-slate-500">Current operational status</p></div><span className="flex items-center gap-2 text-xs font-semibold text-slate-500"><span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgb(16_185_129_/_0.12)]"/>Live</span></div><div className="grid auto-rows-fr grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">{items.map((item) => <MetricCard key={item.label} {...item}/>)}</div></section>;
}
