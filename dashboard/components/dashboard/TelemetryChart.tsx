import { Brush, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface ChartSeries { key: string; name: string; color: string; }
interface Props { data: Array<{ recorded_at: string } & object>; series: ChartSeries[]; unit: string; height?: number; }

const tick = (value: string) => new Intl.DateTimeFormat("en-UG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));

export default function TelemetryChart({ data, series, unit, height = 270 }: Props) {
  return <div style={{ height }} className="w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 12, right: 18, left: -12, bottom: 4 }}>
    <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 5" vertical={false} />
    <XAxis dataKey="recorded_at" tickFormatter={tick} minTickGap={55} tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
    <YAxis unit={unit} tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} width={54} domain={["auto", "auto"]} />
    <Tooltip labelFormatter={(value) => new Date(String(value)).toLocaleString("en-UG")} formatter={(value, name) => [`${Number(value).toFixed(1)}${unit}`, name]} contentStyle={{ borderRadius: 12, borderColor: "#cbd5e1", boxShadow: "0 8px 24px rgb(15 23 42 / .12)" }} />
    {series.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />}
    {series.map((item) => <Line key={item.key} type="monotone" dataKey={item.key} name={item.name} stroke={item.color} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} connectNulls isAnimationActive animationDuration={500} />)}
    <Brush dataKey="recorded_at" tickFormatter={tick} height={24} travellerWidth={8} stroke="#2563eb" fill="#f8fafc" />
  </LineChart></ResponsiveContainer></div>;
}
