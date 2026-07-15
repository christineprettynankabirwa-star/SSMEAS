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
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold text-slate-900">Fill level trend</h2><p className="mt-1 text-sm text-slate-500">{tankName ? `Historical telemetry for ${tankName}.` : "Select a tank to load historical telemetry."}</p></div><span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">Recorded history</span></div><div className="mt-6 h-72" aria-label="Historical tank fill level chart">{tankId && loading ? <div className="h-full animate-pulse rounded-xl bg-slate-100" /> : tankId && error ? <p className="grid h-full place-items-center text-sm text-rose-700">{error}</p> : chartData.length === 0 ? <p className="grid h-full place-items-center text-sm text-slate-500">No historical readings are available for this tank.</p> : <ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}><CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" /><XAxis dataKey="time" minTickGap={42} tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} /><YAxis unit="%" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ borderRadius: 12, borderColor: "#cbd5e1" }} /><Line type="monotone" dataKey="level" name="Fill level" connectNulls stroke="#0891b2" strokeWidth={3} dot={{ r: 3, fill: "#0891b2" }} /></LineChart></ResponsiveContainer>}</div></section>;
}
