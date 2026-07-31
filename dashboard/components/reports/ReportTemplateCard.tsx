"use client";

import type { ReportFormat, ReportType } from "./types";

interface Props {
  title: string;
  description: string;
  type: ReportType;
  busy: boolean;
  onExport: (type: ReportType, format: ReportFormat) => void;
}

export default function ReportTemplateCard({ title, description, type, busy, onExport }: Props) {
  return (
    <article className="flex min-h-48 flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-cyan-300 hover:shadow-md">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-lg font-black text-cyan-700" aria-hidden="true">≡</div>
      <h3 className="font-bold text-slate-900">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-5 flex gap-2">
        <button type="button" disabled={busy} onClick={() => onExport(type, "PDF")} className="h-9 rounded-md bg-cyan-700 px-3 text-xs font-bold text-white hover:bg-cyan-800 disabled:opacity-50">Export PDF</button>
        <button type="button" disabled={busy} onClick={() => onExport(type, "CSV")} className="h-9 rounded-md border border-slate-300 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Export CSV</button>
      </div>
    </article>
  );
}

