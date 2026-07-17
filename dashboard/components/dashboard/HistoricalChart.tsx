import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getReadingHistory } from "@/services/api";
import type { HistoricalSensorReading } from "./types";

interface HistoricalChartProps { tankId?: string; tankName?: string; }

export default function HistoricalChart({ tankId, tankName }: HistoricalChartProps) {
  const [readings, setReadings] = useState<HistoricalSensorReading[]>([]);
  const [loading, setLoading] = useState(Boolean(tankId));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!tankId) return;
    let active = true;
    const load = async () => { setLoading(true); setError(null); try { const data = await getReadingHistory(tankId); if (active) setReadings(data); } catch { if (active) setError("Historical readings are unavailable."); } finally { if (active) setLoading(false); } };
    void load(); const id = window.setInterval(() => void load(), 30_000);
    return () => { active = false; window.clearInterval(id); };
  }, [tankId]);
  const data = tankId ? readings.map((r) => ({ ...r, time: new Date(r.recorded_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) })) : [];
  const chart = (key: "level" | "gas_level", name: string, color: string, unit?: string) => <div className="h-64">{tankId && loading ? <div className="h-full animate-pulse rounded-xl bg-slate-100" /> : tankId && error ? <p className="grid h-full place-items-center text-sm text-rose-700">{error}</p> : data.length === 0 ? <p className="grid h-full place-items-center text-sm text-slate-500">No readings available.</p> : <ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: -20 }}><defs><linearGradient id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={color} stopOpacity={0.24}/><stop offset="95%" stopColor={color} stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#e8edf3" strokeDasharray="3 3" vertical={false}/><XAxis dataKey="time" minTickGap={42} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false}/><YAxis unit={unit} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false}/><Tooltip contentStyle={{ borderRadius: 12, borderColor: "#dbe3ec", boxShadow: "0 10px 30px rgba(15,23,42,.1)" }}/><Area type="monotone" dataKey={key} name={name} connectNulls stroke={color} strokeWidth={2.5} fill={`url(#gradient-${key})`} /></AreaChart></ResponsiveContainer>}</div>;
  return <section><div className="mb-4 flex items-end justify-between gap-4"><div><p className="eyebrow">Telemetry analytics</p><h2 className="section-title">Sensor trends</h2><p className="section-copy">{tankName ? `Recorded history for ${tankName}` : "Select a tank to inspect its history"}</p></div><span className="live-chip"><span />30 sec refresh</span></div><div className="grid gap-4 xl:grid-cols-2"><article className="panel-card p-5"><div className="flex items-center justify-between"><div><h3 className="font-bold text-slate-900">Fill level trend</h3><p className="mt-1 text-xs text-slate-500">Capacity utilization over time</p></div><span className="rounded-lg bg-cyan-50 px-2.5 py-1 text-xs font-bold text-cyan-700">%</span></div><div className="mt-4">{chart("level", "Fill level", "#0891b2", "%")}</div></article><article className="panel-card p-5"><div className="flex items-center justify-between"><div><h3 className="font-bold text-slate-900">Gas concentration</h3><p className="mt-1 text-xs text-slate-500">Environmental sensor trend</p></div><span className="rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">PPM</span></div><div className="mt-4">{chart("gas_level", "Gas level", "#7c3aed")}</div></article></div></section>;
}
