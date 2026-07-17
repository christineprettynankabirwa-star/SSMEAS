import type { SensorReading } from "./types";

interface SummaryCardsProps {
  totalTanks: number;
  onlineTanks: number;
  activeAlerts: number;
  averageFillLevel: number | null;
  reading: SensorReading | null;
}

const icons = {
  tanks: <path d="M7 4h10v16H7zM7 8h10M10 12h4" />,
  signal: <path d="M5 12.5a10 10 0 0 1 14 0M8 16a6 6 0 0 1 8 0M12 20h.01" />,
  alert: <path d="m12 3 9 16H3L12 3Zm0 6v4m0 3h.01" />,
  fill: <path d="M12 3S6 10 6 14a6 6 0 0 0 12 0c0-4-6-11-6-11Z" />,
  gas: <path d="M6 16a4 4 0 0 1 1-7.87A5.5 5.5 0 0 1 17.5 10 3.5 3.5 0 1 1 18 17H7" />,
};

export default function SummaryCards(props: SummaryCardsProps) {
  const items = [
    { label: "Total assets", value: props.totalTanks.toString(), detail: "Registered tanks", icon: icons.tanks, tone: "cyan" },
    { label: "Online now", value: props.onlineTanks.toString(), detail: `${props.totalTanks ? Math.round((props.onlineTanks / props.totalTanks) * 100) : 0}% availability`, icon: icons.signal, tone: "emerald" },
    { label: "Active alerts", value: props.activeAlerts.toString(), detail: props.activeAlerts ? "Requires review" : "All clear", icon: icons.alert, tone: props.activeAlerts ? "amber" : "emerald" },
    { label: "Average fill", value: props.averageFillLevel === null ? "—" : `${props.averageFillLevel.toFixed(1)}%`, detail: "Across the network", icon: icons.fill, tone: "blue" },
    { label: "Gas reading", value: props.reading?.gas_level == null ? "—" : `${props.reading.gas_level.toFixed(0)}`, detail: props.reading?.gas_level == null ? "Awaiting telemetry" : "Latest sensor value", icon: icons.gas, tone: "violet" },
  ];
  return <section aria-label="System summary" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">{items.map((item) => <article key={item.label} className={`kpi-card kpi-${item.tone}`}><div className="flex items-start justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{item.label}</p><p className="mt-2 text-[1.75rem] font-bold leading-none tracking-tight text-slate-950">{item.value}</p></div><span className="kpi-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5">{item.icon}</svg></span></div><p className="mt-4 flex items-center gap-1.5 text-xs font-medium text-slate-500"><span className="size-1.5 rounded-full bg-current opacity-70" />{item.detail}</p></article>)}</section>;
}
