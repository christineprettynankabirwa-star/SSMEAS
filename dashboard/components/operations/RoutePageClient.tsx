"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import OptimizedRoutePanel from "@/components/dashboard/OptimizedRoutePanel";
import RouteDispatcherControls from "./RouteDispatcherControls";
import { getLatestReadings, getOptimizedRoute, getTanks } from "@/services/api";
import type { OptimizedRoute, RouteOptimizationRequest, SensorReading, Tank } from "@/components/dashboard/types";
import { ModuleError, ModuleLoading, ModuleScaffold } from "./ModuleScaffold";
import { useApiSession } from "./useApiSession";

const TankMap = dynamic(() => import("@/components/dashboard/TankMap"), { ssr: false });

export default function RoutePageClient() {
  const session = useApiSession();
  const [route, setRoute] = useState<OptimizedRoute | null>(null);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [optimized, tankList, latest] = await Promise.all([getOptimizedRoute(), getTanks(), getLatestReadings()]);
      setRoute(optimized); setTanks(tankList); setReadings(latest);
    } catch {
      setError("The collection route could not be calculated.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    const id = window.setTimeout(() => { if (session) void load(); else if (session === false) setLoading(false); }, 0);
    return () => window.clearTimeout(id);
  }, [session, load]);
  const recalculate = async (request: RouteOptimizationRequest) => {
    setRecalculating(true); setError(null);
    try { setRoute(await getOptimizedRoute(request)); }
    catch { setError("The route could not be recalculated with those dispatcher controls."); }
    finally { setRecalculating(false); }
  };
  return <ModuleScaffold eyebrow="Collection planning" title="Predictive Route Optimization" description="Selects tanks projected to reach 85% within the planning horizon, then balances urgency, forecast quality, travel, service time, and truck capacity.">
    {loading ? <ModuleLoading /> : error && !route ? <ModuleError message={error} retry={() => void load()} /> : route ? <div className="space-y-5">
      {error && <ModuleError message={error} />}
      <RouteDispatcherControls key={route.generatedAt} route={route} busy={recalculating} onRecalculate={(request) => void recalculate(request)} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(24rem,1fr)]"><TankMap tanks={tanks} readings={readings} route={route} /><OptimizedRoutePanel route={route} /></div>
    </div> : <ModuleError message="No route data is available." retry={() => void load()} />}
  </ModuleScaffold>;
}
