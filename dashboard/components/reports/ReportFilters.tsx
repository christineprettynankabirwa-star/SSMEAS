"use client";

import type { Tank } from "@/components/dashboard/types";
import { REPORT_TYPE_LABELS, type ReportFiltersValue, type ReportFormat } from "./types";

interface Props {
  value: ReportFiltersValue;
  tanks: Tank[];
  generating: boolean;
  onChange: (value: ReportFiltersValue) => void;
  onGenerate: () => void;
}

const inputClass = "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100";

export default function ReportFilters({ value, tanks, generating, onChange, onGenerate }: Props) {
  const field = <K extends keyof ReportFiltersValue>(key: K, next: ReportFiltersValue[K]) =>
    onChange({ ...value, [key]: next });
  return (
    <section aria-label="Report filters" className="border-y border-slate-200 bg-white px-5 py-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1.2fr_1.2fr_.8fr_auto] xl:items-end">
        <label className="text-xs font-bold text-slate-600">Date Range
          <select value={value.datePreset} onChange={(event) => field("datePreset", event.target.value as ReportFiltersValue["datePreset"])} className={`${inputClass} mt-1.5`}>
            <option value="today">Today</option><option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option><option value="custom">Custom Range</option>
          </select>
        </label>
        <label className="text-xs font-bold text-slate-600">Facility / Tank
          <select value={value.tankId} onChange={(event) => field("tankId", event.target.value)} className={`${inputClass} mt-1.5`}>
            <option value="all">All Assets</option>
            {tanks.map((tank) => <option value={tank.id} key={tank.id}>{tank.tank_name} · {tank.location}</option>)}
          </select>
        </label>
        <label className="text-xs font-bold text-slate-600">Report Type
          <select value={value.reportType} onChange={(event) => field("reportType", event.target.value as ReportFiltersValue["reportType"])} className={`${inputClass} mt-1.5`}>
            {Object.entries(REPORT_TYPE_LABELS).map(([key, label]) => <option value={key} key={key}>{label}</option>)}
          </select>
        </label>
        <label className="text-xs font-bold text-slate-600">File Format
          <select value={value.format} onChange={(event) => field("format", event.target.value as ReportFormat)} className={`${inputClass} mt-1.5`}>
            <option>PDF</option><option>CSV</option><option>Excel</option>
          </select>
        </label>
        <button type="button" onClick={onGenerate} disabled={generating}
          className="h-10 rounded-lg bg-cyan-700 px-5 text-sm font-bold whitespace-nowrap text-white hover:bg-cyan-800 disabled:cursor-wait disabled:opacity-60">
          {generating ? "Generating..." : "Generate Report"}
        </button>
      </div>
      {value.datePreset === "custom" && <div className="mt-4 grid max-w-xl gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold text-slate-600">From
          <input type="date" value={value.dateFrom} max={value.dateTo || undefined} onChange={(event) => field("dateFrom", event.target.value)} className={`${inputClass} mt-1.5`} />
        </label>
        <label className="text-xs font-bold text-slate-600">To
          <input type="date" value={value.dateTo} min={value.dateFrom || undefined} onChange={(event) => field("dateTo", event.target.value)} className={`${inputClass} mt-1.5`} />
        </label>
      </div>}
    </section>
  );
}

