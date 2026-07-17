import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getReadingHistory } from "@/services/api";
import type { HistoricalSensorReading } from "./types";

interface HistoricalChartProps { tankId?: string; tankName?: string; }

export default function HistoricalChart({ tankId, tankName }: HistoricalChartProps) {
  const [readings, setReadings] = useState<HistoricalSensorReading[]>([]);
  const [loading, setLoading] = useState(Boolean(tankId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tankId) return;
    let isCurrent = true;
    const loadHistory = async () => {
      setLoading(true); setError(null);
      try { const data = await getReadingHistory(tankId); if (isCurrent) setReadings(data); }
      catch { if (isCurrent) setError("Historical readings are unavailable."); }
      finally { if (isCurrent) setLoading(false); }
    };
    void loadHistory();
    const refreshId = window.setInterval(() => { void loadHistory(); }, 30_000);
    return () => { isCurrent = false; window.clearInterval(refreshId); };
  }, [tankId]);

  const chartData = tankId ? readings.map((reading) => ({ ...reading, time: new Date(reading.recorded_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) })) : [];
  const chart = (key: "level" | "gas_level", name: string, color: string, unit: string) => <ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}><CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" /><XAxis dataKey="time" minTickGap={50} tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis unit={unit} tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ borderRadius: 10, borderColor: "#d1d5db" }} /><Line type="monotone" dataKey={key} name={name} connectNulls stroke={color} strokeWidth={2.5} dot={false} /></LineChart></ResponsiveContainer>;
  return <section className="panel p-5"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold text-slate-900">Historical trends</h2><p className="mt-1 text-sm text-slate-500">{tankName ? `24-hour telemetry for ${tankName}.` : "Select a tank to load telemetry."}</p></div><span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">24 hours</span></div><div className="mt-5">{tankId && loading ? <div className="h-64 animate-pulse rounded-xl bg-slate-100" /> : tankId && error ? <p className="grid h-64 place-items-center text-sm text-red-700">{error}</p> : chartData.length === 0 ? <p className="grid h-64 place-items-center text-sm text-slate-500">No historical readings are available.</p> : <div className="grid gap-5 md:grid-cols-2"><div><h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Fill level</h3><div className="h-56">{chart("level", "Fill level", "#2563eb", "%")}</div></div><div><h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Gas concentration</h3><div className="h-56">{chart("gas_level", "Gas", "#d97706", "")}</div></div></div>}</div></section>;
}
