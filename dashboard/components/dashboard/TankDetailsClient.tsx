"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getTank, setAccessToken } from "@/services/api";
import HistoricalChart from "./HistoricalChart";
import type { Tank } from "./types";

export default function TankDetailsClient({ tankId }: { tankId: string }) {
  const [tank, setTank] = useState<Tank | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = window.sessionStorage.getItem("ssmeas_access_token");
    setAccessToken(token);
    let current = true;
    const loadTank = async () => {
      if (!token) {
        if (current) {
          setError("Please sign in to view tank details.");
          setLoading(false);
        }
        return;
      }
      try {
        const result = await getTank(tankId);
        if (current) setTank(result);
      } catch {
        if (current) setError("Unable to load this tank. It may no longer exist.");
      } finally {
        if (current) setLoading(false);
      }
    };
    void loadTank();
    return () => { current = false; };
  }, [tankId]);

  return (
    <main className="min-h-screen bg-[#f4f7fa] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/#locations" className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 hover:text-cyan-900">← Back to tank map</Link>
        {loading ? (
          <div className="mt-8 grid min-h-72 place-items-center rounded-2xl bg-white"><p className="text-sm font-medium text-slate-600">Loading tank details...</p></div>
        ) : error || !tank ? (
          <div role="alert" className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800">{error ?? "Tank not found."}</div>
        ) : (
          <>
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">Tank details</p><h1 className="mt-2 text-3xl font-bold text-slate-950">{tank.tank_name}</h1><p className="mt-1 text-slate-600">{tank.location}</p></div>
                <span className="w-fit rounded-full bg-cyan-50 px-3 py-1.5 text-sm font-semibold text-cyan-800">{tank.status}</span>
              </div>
              <dl className="mt-8 grid gap-5 border-t border-slate-100 pt-6 sm:grid-cols-2 lg:grid-cols-4">
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Owner</dt><dd className="mt-1 font-semibold text-slate-900">{tank.owner_name}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Capacity</dt><dd className="mt-1 font-semibold text-slate-900">{tank.capacity_liters.toLocaleString()} L</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Latitude</dt><dd className="mt-1 font-semibold text-slate-900">{tank.latitude}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Longitude</dt><dd className="mt-1 font-semibold text-slate-900">{tank.longitude}</dd></div>
              </dl>
            </section>
            <div className="mt-6"><HistoricalChart tankId={tank.id} tankName={tank.tank_name} /></div>
          </>
        )}
      </div>
    </main>
  );
}
