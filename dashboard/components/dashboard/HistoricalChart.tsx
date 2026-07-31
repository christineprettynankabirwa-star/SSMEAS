import { useEffect, useState } from "react";
import { getReadingHistory } from "@/services/api";
import type { HistoricalSensorReading } from "./types";
import TelemetryChart from "./TelemetryChart";

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

  const chartData = tankId ? readings.map((reading) => ({ ...reading })) : [];
  const calibrationWarning = chartData.some(({ level }) => level !== null && (level < 0 || level > 100))
    || chartData.some(({ gas_level }) => gas_level !== null && gas_level < 0);
  return <section className="panel p-5"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold text-slate-900">Sensor history</h2><p className="mt-1 text-sm text-slate-500">{tankName ? `Recorded telemetry for ${tankName}. Drag either navigator to synchronously zoom both charts.` : "Select a tank to load telemetry."}</p></div><span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">Historical</span></div>{calibrationWarning && <div role="alert" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-900">Sensor calibration warning: stored telemetry contains values outside the calibrated range.</div>}<div className="mt-5">{tankId && loading ? <div className="h-64 animate-pulse rounded-xl bg-slate-100" /> : tankId && error ? <p className="grid h-64 place-items-center text-sm text-red-700">{error}</p> : chartData.length === 0 ? <p className="grid h-64 place-items-center text-sm text-slate-500">No historical readings are available.</p> : <div className="grid gap-5 md:grid-cols-2"><div><h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Sewage level (%)</h3><TelemetryChart data={chartData} unit="%" height={250} yDomain={[0, 100]} syncId={`tank-${tankId}`} series={[{ key: "level", name: "Sewage level", color: "#2563eb" }]} /></div><div><h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Gas level (ppm)</h3><TelemetryChart data={chartData} unit=" ppm" height={250} yDomain={[0, "auto"]} syncId={`tank-${tankId}`} series={[{ key: "gas_level", name: "Gas level", color: "#d97706" }]} /></div></div>}</div></section>;
}
