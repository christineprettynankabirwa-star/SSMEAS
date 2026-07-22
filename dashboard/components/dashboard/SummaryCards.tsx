import AnimatedValue from "@/components/ui/AnimatedValue";
import MetricCard from "@/components/ui/MetricCard";
import type { SensorReading } from "./types";
import { isLiveReading } from "./telemetry";

const Icon = ({ path }: { path: string }) => <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={path}/></svg>;
export default function SummaryCards({ reading, lastUpdated }: { reading: SensorReading | null; lastUpdated: Date | null }) {
  const gasWarning = Number(process.env.NEXT_PUBLIC_GAS_WARNING_THRESHOLD ?? 200);
  const gasCritical = Number(process.env.NEXT_PUBLIC_GAS_LEVEL_THRESHOLD ?? 300);
  const dangerous = (reading?.level ?? 0) >= 95 || (reading?.gas_level ?? 0) >= gasCritical;
  const warning = !dangerous && ((reading?.level ?? 0) >= 80 || (reading?.gas_level ?? 0) >= gasWarning);
  const status = !isLiveReading(reading) ? "OFFLINE" : dangerous ? "DANGER" : warning ? "WARNING" : "SAFE";
  const statusTone = status === "DANGER" ? "bg-red-100 text-red-700" : status === "WARNING" ? "bg-amber-100 text-amber-700" : status === "SAFE" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600";
  const items = [
    { label: "Sewage level", value: reading?.level == null ? "—" : <AnimatedValue value={reading.level} decimals={1} suffix="%"/>, detail: "latest tank reading", tone: "bg-cyan-100 text-cyan-700", line: "bg-cyan-400", icon: <Icon path="M5 4v14a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V4M5 13c2-1.5 4 1.5 7 0s5 1.5 7 0"/> },
    { label: "Gas level", value: reading?.gas_level == null ? "—" : <AnimatedValue value={reading.gas_level} decimals={0} suffix=" ppm"/>, detail: "latest gas reading", tone: "bg-orange-100 text-orange-700", line: "bg-orange-400", icon: <Icon path="M8 19c-3-2-3-6 0-8 0 3 2 3 3 1 2-2 1-5-1-7 5 2 6 8 3 11"/> },
    { label: "Tank status", value: status, detail: reading ? "level and gas assessment" : "awaiting telemetry", tone: statusTone, line: status === "DANGER" ? "bg-red-500" : status === "WARNING" ? "bg-amber-500" : status === "SAFE" ? "bg-emerald-500" : "bg-slate-400", icon: <Icon path="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 5v4l3 2"/> },
    { label: "Last updated", value: lastUpdated ? new Intl.DateTimeFormat("en-UG", { hour: "2-digit", minute: "2-digit" }).format(lastUpdated) : "—", detail: lastUpdated ? new Intl.DateTimeFormat("en-UG", { day: "numeric", month: "short", year: "numeric" }).format(lastUpdated) : "waiting for refresh", tone: "bg-violet-100 text-violet-700", line: "bg-violet-400", icon: <Icon path="M12 8v4l3 2M4 5v4h4M5.5 17a8 8 0 1 0-.8-9"/> },
  ];
  return <section aria-labelledby="telemetry-summary-title"><div className="mb-4"><h2 id="telemetry-summary-title" className="text-lg font-bold text-slate-950">Latest telemetry</h2><p className="text-xs text-slate-500">Prototype-supported sewage and gas monitoring</p></div><div className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{items.map((item) => <MetricCard key={item.label} {...item}/>)}</div></section>;
}
