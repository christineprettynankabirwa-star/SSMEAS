"use client";

import { FormEvent, KeyboardEvent, useEffect, useId, useState } from "react";
import { REPORT_TYPE_LABELS, type ReportFormat, type ReportSchedule, type ReportType } from "./types";

interface Props {
  onClose: () => void;
  onSave: (schedule: Omit<ReportSchedule, "id" | "createdAt">) => void;
}

const inputClass = "mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ScheduleReportModal({ onClose, onSave }: Props) {
  const titleId = useId();
  const [frequency, setFrequency] = useState<ReportSchedule["frequency"]>("weekly");
  const [reportType, setReportType] = useState<ReportType>("telemetry");
  const [format, setFormat] = useState<ReportFormat>("PDF");
  const [email, setEmail] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    const close = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  const addEmail = () => {
    const value = email.trim().toLowerCase().replace(/,$/, "");
    if (!value) return;
    if (!emailPattern.test(value)) {
      setError("Enter a valid recipient email address.");
      return;
    }
    if (!recipients.includes(value)) setRecipients((current) => [...current, value]);
    setEmail("");
    setError("");
  };
  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addEmail();
    }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const finalRecipients = [...recipients];
    if (email.trim()) {
      const value = email.trim().toLowerCase();
      if (!emailPattern.test(value)) {
        setError("Enter a valid recipient email address.");
        return;
      }
      if (!finalRecipients.includes(value)) finalRecipients.push(value);
    }
    if (!finalRecipients.length) {
      setError("Add at least one recipient email.");
      return;
    }
    onSave({ frequency, recipients: finalRecipients, reportType, format });
  };
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby={titleId} className="w-full max-w-lg rounded-lg bg-white shadow-2xl">
      <header className="flex items-start justify-between border-b border-slate-200 px-6 py-5"><div><h2 id={titleId} className="text-xl font-bold text-slate-900">Schedule Recurring Report</h2><p className="mt-1 text-sm text-slate-600">Configure an automated operational report.</p></div><button type="button" onClick={onClose} title="Close" aria-label="Close" className="h-9 w-9 rounded-md text-xl text-slate-500 hover:bg-slate-100">×</button></header>
      <form onSubmit={submit} className="space-y-5 px-6 py-5">
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <label className="block text-sm font-semibold text-slate-800">Frequency<select value={frequency} onChange={(event) => setFrequency(event.target.value as ReportSchedule["frequency"])} className={inputClass}><option value="daily">Daily</option><option value="weekly">Weekly on Mondays</option><option value="monthly">Monthly</option></select></label>
        <div><label htmlFor="schedule-email" className="block text-sm font-semibold text-slate-800">Recipient Emails</label>
          {recipients.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{recipients.map((recipient) => <span key={recipient} className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-800">{recipient}<button type="button" onClick={() => setRecipients((current) => current.filter((value) => value !== recipient))} aria-label={`Remove ${recipient}`}>×</button></span>)}</div>}
          <input id="schedule-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} onKeyDown={keyDown} onBlur={addEmail} placeholder="name@example.com, then press Enter" className={inputClass} />
        </div>
        <label className="block text-sm font-semibold text-slate-800">Report Type<select value={reportType} onChange={(event) => setReportType(event.target.value as ReportType)} className={inputClass}>{Object.entries(REPORT_TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="block text-sm font-semibold text-slate-800">Format<select value={format} onChange={(event) => setFormat(event.target.value as ReportFormat)} className={inputClass}><option>PDF</option><option>CSV</option><option>Excel</option></select></label>
        <footer className="flex justify-end gap-3 border-t border-slate-200 pt-5"><button type="button" onClick={onClose} className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-bold text-slate-700">Cancel</button><button type="submit" className="h-10 rounded-lg bg-cyan-700 px-5 text-sm font-bold text-white hover:bg-cyan-800">Save Schedule</button></footer>
      </form>
    </section>
  </div>;
}
