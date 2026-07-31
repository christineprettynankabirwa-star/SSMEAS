"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AppShell from "@/components/ui/AppShell";
import { useAuth } from "@/auth/AuthContext";
import { useApiSession } from "@/components/operations/useApiSession";
import type { Tank } from "@/components/dashboard/types";
import { getTanks } from "@/services/api";
import RecentReportsTable from "./RecentReportsTable";
import ReportFilters from "./ReportFilters";
import ReportTemplateCard from "./ReportTemplateCard";
import ScheduleReportModal from "./ScheduleReportModal";
import {
  createReportBlob,
  downloadBlob,
  fetchReportDataset,
  reportFileName,
  resolveReportRequest,
} from "./reportExport";
import type {
  ReportFiltersValue,
  ReportFormat,
  ReportJob,
  ReportSchedule,
  ReportType,
  ResolvedReportRequest,
} from "./types";

const JOBS_KEY = "ssmeas_report_jobs";
const SCHEDULES_KEY = "ssmeas_report_schedules";
const isoDate = (date: Date): string => date.toISOString().slice(0, 10);
const defaultFilters = (): ReportFiltersValue => {
  const today = new Date();
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 29);
  return {
    datePreset: "30d",
    dateFrom: isoDate(monthAgo),
    dateTo: isoDate(today),
    tankId: "all",
    reportType: "telemetry",
    format: "PDF",
  };
};
const templates: Array<{ title: string; description: string; type: ReportType }> = [
  {
    title: "Daily Tank Telemetry Summary",
    description: "Overview of sewage and gas levels, operating trends, and recorded fill events.",
    type: "telemetry",
  },
  {
    title: "Incident & Alert Audit Log",
    description: "Historical breakdown of critical alerts, response times, acknowledgements, and resolutions.",
    type: "alerts",
  },
  {
    title: "Maintenance & Service History",
    description: "Logs of completed, scheduled, cancelled, and overdue maintenance activities.",
    type: "maintenance",
  },
];

export default function ReportsPageClient() {
  const session = useApiSession();
  const { user } = useAuth();
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [filters, setFilters] = useState<ReportFiltersValue>(defaultFilters);
  const [jobs, setJobs] = useState<ReportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const blobs = useRef(new Map<string, Blob>());

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        setJobs(JSON.parse(localStorage.getItem(JOBS_KEY) ?? "[]") as ReportJob[]);
      } catch {
        localStorage.removeItem(JOBS_KEY);
      }
      if (!session) {
        setLoading(false);
        return;
      }
      getTanks()
        .then(setTanks)
        .catch(() => setMessage({ tone: "error", text: "Assets could not be loaded. Reports can still use accessible operational records." }))
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(id);
  }, [session]);

  const saveJobs = useCallback((next: ReportJob[]) => {
    setJobs(next);
    localStorage.setItem(JOBS_KEY, JSON.stringify(next.slice(0, 25)));
  }, []);

  const buildBlob = useCallback(async (request: ResolvedReportRequest): Promise<Blob> => {
    const dataset = await fetchReportDataset(request, tanks);
    return createReportBlob(dataset, request);
  }, [tanks]);

  const generate = useCallback(async (
    requestFilters: ReportFiltersValue,
    shouldDownload = true,
  ): Promise<ReportJob | null> => {
    if (requestFilters.datePreset === "custom" && (!requestFilters.dateFrom || !requestFilters.dateTo || requestFilters.dateFrom > requestFilters.dateTo)) {
      setMessage({ tone: "error", text: "Select a valid custom date range." });
      return null;
    }
    const request = resolveReportRequest(requestFilters, tanks);
    const id = crypto.randomUUID();
    const job: ReportJob = {
      id,
      fileName: reportFileName(request),
      generatedAt: new Date().toISOString(),
      format: request.format,
      generatedBy: user?.full_name ?? "System Scheduled",
      status: "Processing",
      request,
    };
    const processingJobs = [job, ...jobs].slice(0, 25);
    saveJobs(processingJobs);
    setGenerating(true);
    setMessage(null);
    try {
      const blob = await buildBlob(request);
      blobs.current.set(id, blob);
      const ready = { ...job, status: "Ready" as const };
      saveJobs(processingJobs.map((item) => item.id === id ? ready : item));
      if (shouldDownload) downloadBlob(blob, ready.fileName);
      setMessage({ tone: "success", text: `${ready.fileName} is ready.` });
      return ready;
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Report generation failed.";
      saveJobs(processingJobs.map((item) => item.id === id ? { ...item, status: "Failed" as const, error: detail } : item));
      setMessage({ tone: "error", text: "The report could not be generated from the selected records." });
      return null;
    } finally {
      setGenerating(false);
    }
  }, [buildBlob, jobs, saveJobs, tanks, user?.full_name]);

  const quickExport = (reportType: ReportType, format: ReportFormat) => {
    const preset: ReportFiltersValue = {
      ...filters,
      datePreset: reportType === "telemetry" ? "today" : "30d",
      reportType,
      format,
    };
    void generate(preset);
  };
  const getJobBlob = async (job: ReportJob): Promise<Blob> => {
    const cached = blobs.current.get(job.id);
    if (cached) return cached;
    const blob = await buildBlob(job.request);
    blobs.current.set(job.id, blob);
    return blob;
  };
  const download = async (job: ReportJob) => {
    try {
      downloadBlob(await getJobBlob(job), job.fileName);
    } catch {
      setMessage({ tone: "error", text: "The report could not be rebuilt for download." });
    }
  };
  const share = async (job: ReportJob) => {
    try {
      const blob = await getJobBlob(job);
      const file = new File([blob], job.fileName, { type: blob.type });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: job.fileName, files: [file] });
        return;
      }
      downloadBlob(blob, job.fileName);
      setMessage({ tone: "success", text: "File sharing is unavailable in this browser, so the report was downloaded." });
    } catch (error) {
      if ((error as DOMException).name !== "AbortError") setMessage({ tone: "error", text: "The report could not be shared." });
    }
  };
  const remove = (job: ReportJob) => {
    blobs.current.delete(job.id);
    saveJobs(jobs.filter((item) => item.id !== job.id));
    setMessage({ tone: "success", text: `${job.fileName} was removed from recent reports.` });
  };
  const saveSchedule = (value: Omit<ReportSchedule, "id" | "createdAt">) => {
    let schedules: ReportSchedule[] = [];
    try {
      schedules = JSON.parse(localStorage.getItem(SCHEDULES_KEY) ?? "[]") as ReportSchedule[];
    } catch {
      schedules = [];
    }
    schedules.unshift({ ...value, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    localStorage.setItem(SCHEDULES_KEY, JSON.stringify(schedules));
    setScheduleOpen(false);
    setMessage({ tone: "success", text: "Recurring report schedule saved." });
  };

  return <AppShell><main className="min-h-screen px-4 py-7 sm:px-6 lg:px-8"><div className="mx-auto max-w-[1600px] space-y-6">
    <header className="flex flex-col gap-4 pt-10 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-black uppercase tracking-widest text-cyan-700">Decision Support</p><h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">Operational Reports</h1><p className="mt-2 max-w-3xl text-sm text-slate-600">Generate audit-ready exports from telemetry, alerts, and maintenance records.</p></div>
      <button type="button" onClick={() => setScheduleOpen(true)} className="h-10 rounded-lg border border-cyan-700 bg-white px-4 text-sm font-bold text-cyan-800 hover:bg-cyan-50">+ Schedule Recurring Report</button>
    </header>
    {message && <div role={message.tone === "error" ? "alert" : "status"} className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium ${message.tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}><span>{message.text}</span><button type="button" onClick={() => setMessage(null)} aria-label="Dismiss message" className="ml-4 text-lg">×</button></div>}
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="px-5 pt-5"><h2 className="font-bold text-slate-900">Dynamic Report Generator</h2><p className="mt-1 text-xs text-slate-500">Filter operational records and choose an export format.</p></div>
      <ReportFilters value={filters} tanks={tanks} generating={generating} onChange={setFilters} onGenerate={() => void generate(filters)} />
    </div>
    <section><header className="mb-4"><h2 className="text-lg font-bold text-slate-900">Standard Report Templates</h2><p className="mt-1 text-sm text-slate-500">Common operational exports using predefined date ranges.</p></header>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{templates.map((template) => <ReportTemplateCard key={template.type} {...template} busy={generating} onExport={quickExport} />)}</div>
    </section>
    <RecentReportsTable jobs={jobs} loading={loading} onDownload={(job) => void download(job)} onShare={(job) => void share(job)} onDelete={remove} />
  </div></main>
  {scheduleOpen && <ScheduleReportModal onClose={() => setScheduleOpen(false)} onSave={saveSchedule} />}
  </AppShell>;
}

