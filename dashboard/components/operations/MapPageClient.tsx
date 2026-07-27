"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import type { SensorReading, Tank } from "@/components/dashboard/types";
import { getLatestReadings, getTanks } from "@/services/api";
import { ModuleError, ModuleLoading, ModuleScaffold } from "./ModuleScaffold";
import { useApiSession } from "./useApiSession";
import { subscribeDataRefresh } from "@/services/data-refresh";

const TankMap = dynamic(() => import("@/components/dashboard/TankMap"), {
  ssr: false,
  loading: () => <div className="h-[600px] animate-pulse rounded-2xl bg-slate-200"/>,
});

const initialFocus = (): { tankId: string | null; zoom: number } => {
  if (typeof window === "undefined") return { tankId: null, zoom: 17 };
  const query = new URLSearchParams(window.location.search);
  const requestedZoom = Number(query.get("zoom"));
  return {
    tankId: query.get("tank"),
    zoom: Number.isFinite(requestedZoom)
      ? Math.min(19, Math.max(1, requestedZoom))
      : 17,
  };
};

export default function MapPageClient() {
  const session = useApiSession();
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [focus] = useState(initialFocus);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const nextTanks = await getTanks();
      setTanks(nextTanks);
      setReadings(await getLatestReadings().catch(() => []));
      setError(null);
    } catch {
      setError("GIS data could not be loaded from the monitoring API.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (session) void load();
      else if (session === false) setLoading(false);
    }, 0);
    return () => window.clearTimeout(id);
  }, [session, load]);
  useEffect(() => subscribeDataRefresh(() => void load()), [load]);

  return <ModuleScaffold
    eyebrow="Geospatial operations"
    title="Tank GIS Map"
    description="OpenStreetMap view of every monitored asset, coloured by its latest sewage and gas condition."
  >
    {loading
      ? <ModuleLoading/>
      : error
        ? <ModuleError message={error} retry={() => void load()}/>
        : tanks.length
          ? <TankMap
              tanks={tanks}
              readings={readings}
              route={null}
              focusTankId={focus.tankId}
              focusZoom={focus.zoom}
            />
          : <div className="rounded-2xl bg-white p-12 text-center text-slate-500">
              No mapped tanks are registered.
            </div>}
  </ModuleScaffold>;
}
