"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AlertItem, PredictionApiResponse, SensorReading } from "@/components/dashboard/types";
import {
  acknowledgeAlert, getAlerts, getLatestReadings, getOverflowPredictions,
} from "@/services/api";
import { subscribeDataRefresh } from "@/services/data-refresh";
import { announceDataRefresh } from "@/services/data-refresh";
import { useAuth } from "@/auth/AuthContext";

const alarmPath = "/audio/mixkit-facility-alarm-sound-999.wav";

export default function EmergencyAlertSystem() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [predictions, setPredictions] = useState<PredictionApiResponse[]>([]);
  const [error, setError] = useState("");
  const audio = useRef<HTMLAudioElement | null>(null);

  const load = useCallback(async () => {
    try {
      const [nextAlerts, nextReadings, nextPredictions] = await Promise.all([
        getAlerts(), getLatestReadings(), getOverflowPredictions(),
      ]);
      setAlerts(nextAlerts.filter((alert) =>
        alert.status === "ACTIVE" && alert.severity === "critical"));
      setReadings(nextReadings);
      setPredictions(nextPredictions);
      setError("");
    } catch {
      // Keep the last confirmed emergency visible during transient API failures.
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const refresh = window.setInterval(() => void load(), 3_000);
    const unsubscribe = subscribeDataRefresh(() => void load());
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(refresh);
      unsubscribe();
    };
  }, [load]);

  useEffect(() => {
    if (!audio.current) {
      audio.current = new Audio(alarmPath);
      audio.current.loop = true;
      audio.current.preload = "auto";
    }
    const player = audio.current;
    const activeCount = alerts.filter(({ status }) => status === "ACTIVE").length;
    if (activeCount > 0) {
      if (player.paused) void player.play().catch(() => {
        // Browsers can require the first user gesture before audible autoplay.
      });
    } else {
      player.pause();
      player.currentTime = 0;
    }
    return () => {
      if (activeCount === 0) {
        player.pause();
        player.currentTime = 0;
      }
    };
  }, [alerts]);
  useEffect(() => () => {
    audio.current?.pause();
    if (audio.current) audio.current.currentTime = 0;
  }, []);

  const alert = alerts[0] ?? null;
  const reading = useMemo(
    () => alert ? readings.find((item) => item.tank_id === alert.tank_id) ?? null : null,
    [alert, readings],
  );
  const prediction = useMemo(
    () => alert ? predictions.find((item) => item.tank_id === alert.tank_id) ?? null : null,
    [alert, predictions],
  );

  const acknowledge = async () => {
    if (!alert) return;
    audio.current?.pause();
    if (audio.current) audio.current.currentTime = 0;
    setAlerts((current) => current.filter(({ id }) => id !== alert.id));
    try {
      await acknowledgeAlert(alert.id);
      announceDataRefresh();
      await load();
    } catch {
      setError("The alert could not be acknowledged. Check your role and try again.");
      await load();
    }
  };

  if (!alert) return null;
  const predictedText = prediction?.overflow_projection.remainingHours == null
    ? "Not available"
    : `${prediction.overflow_projection.remainingHours.toFixed(1)} hours`;

  return <>
    <div aria-label={`${alerts.length} active critical alerts`}
      className="fixed left-0 top-0 z-[1600] hidden h-full w-2 animate-pulse bg-red-600 shadow-[0_0_25px_#dc2626] lg:block" />
    <div className="fixed right-36 top-3 z-[1600] flex h-10 min-w-10 items-center justify-center rounded-xl bg-red-700 px-3 text-sm font-black text-white shadow-lg shadow-red-500/40"
      title="Active critical alerts">
      🚨 {alerts.length}
    </div>
    <div className="fixed inset-0 z-[5000] grid place-items-center overflow-y-auto bg-red-950/90 p-4 backdrop-blur-sm"
      role="alertdialog" aria-modal="true" aria-labelledby="critical-alert-title">
      <section className="critical-alert-frame my-auto w-full max-w-3xl rounded-3xl border-4 border-red-400 bg-slate-950 p-6 text-white shadow-[0_0_80px_rgb(239_68_68/.65)] sm:p-10">
        <div className="text-center">
          <div className="text-7xl" aria-hidden="true">🚨</div>
          <p className="mt-3 text-xs font-black uppercase tracking-[.3em] text-red-300">
            {alerts.length} active critical {alerts.length === 1 ? "alert" : "alerts"}
          </p>
          <h1 id="critical-alert-title" className="mt-3 text-3xl font-black text-red-100 sm:text-5xl">
            CRITICAL SEWER ALERT
          </h1>
        </div>
        <dl className="mt-8 grid gap-3 rounded-2xl bg-red-950/60 p-5 sm:grid-cols-2">
          {[
            ["Tank", alert.tank_name],
            ["Location", alert.location],
            ["Current sewage level", reading?.level == null ? "Unavailable" : `${reading.level.toFixed(1)}%`],
            ["Current gas level", reading?.gas_level == null ? "Unavailable" : `${reading.gas_level.toFixed(1)}`],
            ["Predicted overflow", predictedText],
            ["Detected", new Date(alert.created_at).toLocaleString("en-UG")],
          ].map(([label, value]) => <div key={label} className="rounded-xl bg-black/25 p-3">
            <dt className="text-xs font-bold uppercase tracking-wide text-red-300">{label}</dt>
            <dd className="mt-1 text-lg font-bold">{value}</dd>
          </div>)}
        </dl>
        <p className="mt-5 rounded-xl border border-red-500/40 bg-red-900/40 p-4 text-center text-lg font-semibold">
          {alert.message}
        </p>
        {error && <p className="mt-3 text-center text-sm font-bold text-amber-300">{error}</p>}
        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          {user?.role === "ADMINISTRATOR" && <button type="button" onClick={() => void acknowledge()}
            className="rounded-xl bg-red-600 px-4 py-3 font-black text-white hover:bg-red-500">
            Acknowledge Alert
          </button>}
          <Link href={`/tanks/${encodeURIComponent(alert.tank_id)}`}
            className="rounded-xl border border-red-300 px-4 py-3 text-center font-bold hover:bg-white/10">
            View Tank
          </Link>
          <Link href={`/map?tank=${encodeURIComponent(alert.tank_id)}&zoom=17`}
            className="rounded-xl border border-red-300 px-4 py-3 text-center font-bold hover:bg-white/10">
            View Map
          </Link>
        </div>
      </section>
    </div>
  </>;
}
