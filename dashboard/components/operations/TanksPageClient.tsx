"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createTank,
  getLatestReadings,
  getReadingHistory,
  getTanks,
  updateTank,
  type TankConfigurationInput,
} from "@/services/api";
import type { HistoricalSensorReading, SensorReading, Tank } from "@/components/dashboard/types";
import TelemetryChart from "@/components/dashboard/TelemetryChart";
import { ModuleError, ModuleLoading, ModuleScaffold } from "./ModuleScaffold";
import { useApiSession } from "./useApiSession";
import { subscribeDataRefresh } from "@/services/data-refresh";
import { classifyReading } from "@/services/alert-thresholds";
import { isLiveReading } from "@/components/dashboard/telemetry";

type Filter = "ALL" | "HIGH" | "OFFLINE";
type SortKey = "fill" | "capacity" | "communication";
type Draft = {
  tank_name: string;
  location: string;
  capacity_liters: string;
  hardware_id: string;
  thingspeak_channel_id: string;
  warning_fill_threshold: string;
  critical_fill_threshold: string;
};

const blankDraft: Draft = {
  tank_name: "",
  location: "",
  capacity_liters: "",
  hardware_id: "",
  thingspeak_channel_id: "",
  warning_fill_threshold: "80",
  critical_fill_threshold: "95",
};

const tones = {
  SAFE: "bg-emerald-50 text-emerald-700",
  WARNING: "bg-amber-50 text-amber-700",
  DANGER: "bg-red-50 text-red-700",
  OFFLINE: "bg-slate-100 text-slate-600",
};

const fillTone = (level: number | null | undefined) =>
  (level ?? 0) >= 85 ? "bg-red-500" : (level ?? 0) >= 65 ? "bg-amber-500" : "bg-emerald-500";

const draftFromTank = (tank: Tank): Draft => ({
  tank_name: tank.tank_name,
  location: tank.location,
  capacity_liters: String(tank.capacity_liters),
  hardware_id: tank.hardware_id ?? "",
  thingspeak_channel_id: String(tank.thingspeak_channel_id ?? ""),
  warning_fill_threshold: String(tank.warning_fill_threshold ?? 80),
  critical_fill_threshold: String(tank.critical_fill_threshold ?? 95),
});

function TankFormModal({
  tank,
  onClose,
  onSaved,
}: {
  tank: Tank | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => tank ? draftFromTank(tank) : blankDraft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const field = (key: keyof Draft, label: string, type = "text", placeholder?: string) =>
    <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
      {label}
      <input
        required
        type={type}
        placeholder={placeholder}
        value={draft[key]}
        onChange={(event) => setDraft((value) => ({ ...value, [key]: event.target.value }))}
        className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-cyan-600"
      />
    </label>;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const warning = Number(draft.warning_fill_threshold);
    const critical = Number(draft.critical_fill_threshold);
    if (warning >= critical) {
      setError("Warning threshold must be below the critical threshold.");
      setSaving(false);
      return;
    }
    const input: TankConfigurationInput = {
      tank_name: draft.tank_name.trim(),
      location: draft.location.trim(),
      owner_name: draft.location.trim(),
      latitude: tank?.latitude ?? 0,
      longitude: tank?.longitude ?? 0,
      capacity_liters: Number(draft.capacity_liters),
      hardware_id: draft.hardware_id.trim() || null,
      thingspeak_channel_id: draft.thingspeak_channel_id ? Number(draft.thingspeak_channel_id) : undefined,
      warning_fill_threshold: warning,
      critical_fill_threshold: critical,
    };
    try {
      if (tank) await updateTank(tank.id, input);
      else await createTank(input);
      onSaved();
    } catch {
      setError("The asset configuration could not be saved. Check the values and try again.");
    } finally {
      setSaving(false);
    }
  };

  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label={tank ? "Edit tank configuration" : "Register new tank"}>
    <form onSubmit={submit} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-700">Asset configuration</p>
          <h2 className="mt-1 text-xl font-bold">{tank ? "Edit tank configuration" : "Register new tank"}</h2>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">x</button>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {field("tank_name", "Tank name")}
        {field("location", "Facility / location name")}
        {field("capacity_liters", "Total capacity (liters)", "number", "80000")}
        {field("hardware_id", "ESP32 MAC address / hardware ID", "text", "AA:BB:CC:DD:EE:FF")}
        {field("thingspeak_channel_id", "ThingSpeak channel ID", "number")}
        <div className="grid grid-cols-2 gap-3">
          {field("warning_fill_threshold", "Warning fill %", "number")}
          {field("critical_fill_threshold", "Critical fill %", "number")}
        </div>
      </div>
      {!tank && <p className="mt-4 rounded-lg bg-blue-50 p-3 text-xs text-blue-800">The asset will be registered at neutral map coordinates. Use GIS configuration to place it precisely after registration.</p>}
      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold">Cancel</button>
        <button disabled={saving} className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-60">{saving ? "Saving..." : tank ? "Save configuration" : "Register tank"}</button>
      </div>
    </form>
  </div>;
}

function ConfirmDecommission({ tank, onClose, onDone }: { tank: Tank; onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" role="alertdialog" aria-modal="true">
    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
      <h2 className="text-xl font-bold text-slate-950">Decommission asset?</h2>
      <p className="mt-2 text-sm text-slate-600">{tank.tank_name} will become inactive and remain available for historical audit and telemetry review.</p>
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-bold">Cancel</button>
        <button disabled={busy} onClick={async () => { setBusy(true); await updateTank(tank.id, { status: "INACTIVE" }); onDone(); }} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white">{busy ? "Decommissioning..." : "Decommission"}</button>
      </div>
    </div>
  </div>;
}

function TankDrawer({ tank, reading, onClose }: { tank: Tank; reading?: SensorReading; onClose: () => void }) {
  const [history, setHistory] = useState<HistoricalSensorReading[]>([]);
  useEffect(() => {
    let live = true;
    void getReadingHistory(tank.id)
      .then((value) => { if (live) setHistory(value.slice(-100)); })
      .catch(() => setHistory([]));
    return () => { live = false; };
  }, [tank.id]);
  const live = isLiveReading(reading);

  return <div className="fixed inset-0 z-40 bg-slate-950/35" onMouseDown={onClose}>
    <aside className="ml-auto h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${tank.tank_name} telemetry details`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-700">Asset telemetry</p>
          <h2 className="mt-1 text-2xl font-bold">{tank.tank_name}</h2>
          <p className="text-sm text-slate-500">{tank.location}</p>
        </div>
        <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Close">x</button>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Sensor health</p>
          <p className={`mt-1 font-bold ${live ? "text-emerald-700" : "text-red-700"}`}>{live ? "Online - communicating" : "Offline - stale"}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Hardware ID</p>
          <p className="mt-1 break-all font-mono text-sm font-bold">{tank.hardware_id ?? "Not assigned"}</p>
        </div>
      </div>
      <div className="mt-6 space-y-5">
        <section>
          <h3 className="mb-2 font-bold">Fill history</h3>
          {history.length
            ? <TelemetryChart data={history} unit="%" height={250} yDomain={[0, 100]} series={[{ key: "level", name: "Fill level", color: "#0891b2" }]} />
            : <p className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">No telemetry history.</p>}
        </section>
        <section>
          <h3 className="mb-2 font-bold">Gas history</h3>
          {history.length ? <TelemetryChart data={history} unit=" ppm" height={250} yDomain={[0, "auto"]} series={[{ key: "gas_level", name: "Gas level", color: "#d97706" }]} /> : null}
        </section>
      </div>
    </aside>
  </div>;
}

export default function TanksPageClient() {
  const session = useApiSession();
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [sort, setSort] = useState<{ key: SortKey; direction: 1 | -1 }>({ key: "communication", direction: -1 });
  const [editing, setEditing] = useState<Tank | null | undefined>(undefined);
  const [decommissioning, setDecommissioning] = useState<Tank | null>(null);
  const [selected, setSelected] = useState<Tank | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextTanks, nextReadings] = await Promise.all([getTanks(), getLatestReadings().catch(() => [])]);
      setTanks(nextTanks);
      setReadings(nextReadings);
    } catch {
      setError("Unable to load the tank registry and live telemetry.");
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

  const byTank = useMemo(() => new Map(readings.map((reading) => [reading.tank_id, reading])), [readings]);
  const visible = useMemo(() => tanks
    .filter((tank) => [tank.tank_name, tank.location, tank.owner_name, String(tank.thingspeak_channel_id ?? ""), tank.hardware_id ?? ""]
      .some((value) => value.toLowerCase().includes(query.toLowerCase())))
    .filter((tank) => filter === "ALL"
      || (filter === "HIGH" ? (byTank.get(tank.id)?.level ?? 0) >= 65 : !isLiveReading(byTank.get(tank.id))))
    .sort((left, right) => {
      const leftReading = byTank.get(left.id);
      const rightReading = byTank.get(right.id);
      const values = sort.key === "fill"
        ? [leftReading?.level ?? -1, rightReading?.level ?? -1]
        : sort.key === "capacity"
          ? [left.capacity_liters, right.capacity_liters]
          : [leftReading ? new Date(leftReading.recorded_at).getTime() : 0, rightReading ? new Date(rightReading.recorded_at).getTime() : 0];
      return (values[0]! - values[1]!) * sort.direction;
    }), [tanks, query, filter, sort, byTank]);

  const setSortKey = (key: SortKey) => setSort((value) => ({
    key,
    direction: value.key === key ? (value.direction === 1 ? -1 : 1) : -1,
  }));
  const sortable = (label: string, key: SortKey) =>
    <button onClick={() => setSortKey(key)} className="inline-flex items-center gap-1 font-bold uppercase">
      {label}<span aria-hidden="true">{sort.key === key ? (sort.direction === 1 ? "ASC" : "DESC") : "SORT"}</span>
    </button>;
  const saved = () => {
    setEditing(undefined);
    setDecommissioning(null);
    void load();
  };

  return <ModuleScaffold
    eyebrow="Asset registry"
    title="Tanks Management"
    description="Live operating condition, device assignment and ownership for every registered sewer tank."
    actions={<div className="flex flex-wrap gap-2">
      <button onClick={() => setEditing(null)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">+ Register New Tank</button>
      <Link href="/map" className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950">Open GIS map</Link>
    </div>}
  >
    {loading ? <ModuleLoading /> : error ? <ModuleError message={error} retry={() => void load()} /> : <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-900">Registered tanks</h2>
            <p className="text-sm text-slate-500">{visible.length} of {tanks.length} assets</p>
          </div>
          <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search tanks" placeholder="Search tank, location, owner, device or channel" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-600 sm:w-96" />
        </div>
        <div className="mt-4 flex gap-2">
          {([["ALL", "All Assets"], ["HIGH", "High Fill"], ["OFFLINE", "Sensor Offline"]] as const).map(([value, label]) =>
            <button key={value} onClick={() => setFilter(value)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${filter === value ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{label}</button>)}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1350px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Tank</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">{sortable("Fill %", "fill")}</th>
              <th className="px-4 py-3">Gas</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Assigned device</th>
              <th className="px-4 py-3">{sortable("Last communication", "communication")}</th>
              <th className="px-4 py-3">ThingSpeak</th>
              <th className="px-4 py-3">{sortable("Capacity", "capacity")}</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((tank) => {
              const reading = byTank.get(tank.id);
              const state = classifyReading(isLiveReading(reading) ? reading : undefined);
              const live = isLiveReading(reading);
              return <tr key={tank.id} tabIndex={0} onClick={() => setSelected(tank)} onKeyDown={(event) => { if (event.key === "Enter") setSelected(tank); }} className="cursor-pointer hover:bg-cyan-50/40">
                <td className="px-4 py-4 font-bold text-slate-900">{tank.tank_name}</td>
                <td className="px-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${tones[state]}`}>{state}</span></td>
                <td className="px-4">
                  <div className="flex min-w-28 items-center gap-2">
                    <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-200">
                      <div className={`h-full rounded-full ${fillTone(reading?.level)}`} style={{ width: `${Math.max(0, Math.min(100, reading?.level ?? 0))}%` }} />
                    </div>
                    <span className="font-semibold">{reading?.level == null ? "-" : `${reading.level.toFixed(1)}%`}</span>
                  </div>
                </td>
                <td className="px-4">{reading?.gas_level == null ? "-" : `${reading.gas_level.toFixed(0)} ppm`}</td>
                <td className="px-4 text-slate-600">{tank.location}</td>
                <td className="px-4 font-mono text-xs">{tank.hardware_id ?? reading?.device_reading_id?.slice(0, 12) ?? "Not assigned"}</td>
                <td className="whitespace-nowrap px-4 text-slate-600"><span className={`mr-2 inline-block size-2.5 rounded-full ${live ? "bg-emerald-500" : "bg-red-500"}`} />{reading ? new Date(reading.recorded_at).toLocaleString("en-UG") : "Never"}</td>
                <td className="px-4">{tank.thingspeak_channel_id ? <a onClick={(event) => event.stopPropagation()} href={`https://thingspeak.com/channels/${tank.thingspeak_channel_id}`} target="_blank" rel="noreferrer" className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 font-mono text-xs font-bold text-blue-700 hover:bg-blue-100">{tank.thingspeak_channel_id} open</a> : "-"}</td>
                <td className="whitespace-nowrap px-4">{tank.capacity_liters.toLocaleString()} L</td>
                <td className="px-4 text-slate-600">{tank.owner_name}</td>
                <td className="px-4" onClick={(event) => event.stopPropagation()}>
                  <div className="flex gap-1">
                    <button onClick={() => setEditing(tank)} title="Edit config" aria-label={`Edit ${tank.tank_name}`} className="rounded-lg border px-2.5 py-2 hover:bg-slate-50">Edit</button>
                    <Link href={`/analytics?tank=${encodeURIComponent(tank.id)}`} title="View analytics" aria-label={`View analytics for ${tank.tank_name}`} className="rounded-lg border px-2.5 py-2 hover:bg-slate-50">Analytics</Link>
                    <button onClick={() => setDecommissioning(tank)} title="Decommission asset" aria-label={`Decommission ${tank.tank_name}`} className="rounded-lg border border-red-200 px-2.5 py-2 text-red-700 hover:bg-red-50">Remove</button>
                  </div>
                </td>
              </tr>;
            })}
            {visible.length === 0 && <tr><td colSpan={11} className="p-12 text-center text-slate-500">No tanks match the current search or filter.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>}
    {editing !== undefined && <TankFormModal tank={editing} onClose={() => setEditing(undefined)} onSaved={saved} />}
    {decommissioning && <ConfirmDecommission tank={decommissioning} onClose={() => setDecommissioning(null)} onDone={saved} />}
    {selected && <TankDrawer tank={selected} reading={byTank.get(selected.id)} onClose={() => setSelected(null)} />}
  </ModuleScaffold>;
}
