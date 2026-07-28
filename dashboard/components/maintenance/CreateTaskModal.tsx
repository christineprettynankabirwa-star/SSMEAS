"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import type { MaintenanceOfficer, MaintenancePriority, Tank } from "@/components/dashboard/types";

export interface CreateTaskValues {
  tankId: string;
  task: string;
  officerId: string;
  priority: MaintenancePriority;
  scheduledFor: string;
}

interface Props {
  tanks: Tank[];
  officers: MaintenanceOfficer[];
  onClose: () => void;
  onSubmit: (value: CreateTaskValues) => Promise<void>;
}

const fieldClass = (error?: string) => `mt-1.5 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-2 ${error ? "border-red-500 focus:ring-red-100" : "border-slate-300 focus:border-cyan-700 focus:ring-cyan-100"}`;

export default function CreateTaskModal({ tanks, officers, onClose, onSubmit }: Props) {
  const titleId = useId();
  const [value, setValue] = useState<CreateTaskValues>({ tankId: "", task: "", officerId: "", priority: "HIGH", scheduledFor: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape" && !saving) onClose(); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose, saving]);
  const set = <K extends keyof CreateTaskValues>(key: K, next: CreateTaskValues[K]) => {
    setValue((current) => ({ ...current, [key]: next }));
    setErrors((current) => ({ ...current, [key]: "", form: "" }));
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!value.tankId) nextErrors.tankId = "Select a tank.";
    if (value.task.trim().length < 3) nextErrors.task = "Enter a task description of at least 3 characters.";
    if (value.task.trim().length > 255) nextErrors.task = "Task description must be 255 characters or fewer.";
    if (!value.scheduledFor || Number.isNaN(new Date(value.scheduledFor).getTime())) nextErrors.scheduledFor = "Select a valid scheduled date and time.";
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); return; }
    setSaving(true);
    try { await onSubmit({ ...value, task: value.task.trim() }); }
    catch (error) {
      setErrors({ form: error instanceof Error ? error.message : "The maintenance task could not be created." });
      setSaving(false);
    }
  };
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby={titleId} className="w-full max-w-xl rounded-lg bg-white shadow-2xl">
      <header className="flex items-start justify-between border-b border-slate-200 px-6 py-5"><div><h2 id={titleId} className="text-xl font-bold text-slate-900">Create Maintenance Task</h2><p className="mt-1 text-sm text-slate-600">Schedule and assign field work.</p></div><button type="button" onClick={onClose} disabled={saving} aria-label="Close dialog" title="Close dialog" className="h-9 w-9 rounded-md text-xl text-slate-500 hover:bg-slate-100">×</button></header>
      <form onSubmit={submit} noValidate className="space-y-5 px-6 py-5">
        {errors.form && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errors.form}</p>}
        <label className="block text-sm font-semibold text-slate-800">Select Tank<select autoFocus value={value.tankId} onChange={(event) => set("tankId", event.target.value)} className={`${fieldClass(errors.tankId)} h-11`}><option value="">Choose a tank</option>{tanks.map((tank) => <option key={tank.id} value={tank.id}>{tank.tank_name} · {tank.location}</option>)}</select>{errors.tankId && <span className="mt-1 block text-xs text-red-600">{errors.tankId}</span>}</label>
        <label className="block text-sm font-semibold text-slate-800">Task Description<textarea value={value.task} onChange={(event) => set("task", event.target.value)} rows={3} placeholder="Describe the inspection, collection, or repair work" className={`${fieldClass(errors.task)} py-3`} />{errors.task && <span className="mt-1 block text-xs text-red-600">{errors.task}</span>}</label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold text-slate-800">Assigned Officer<select value={value.officerId} onChange={(event) => set("officerId", event.target.value)} className={`${fieldClass()} h-11`}><option value="">Unassigned</option>{officers.map((officer) => <option key={officer.id} value={officer.id}>{officer.full_name}</option>)}</select></label><label className="block text-sm font-semibold text-slate-800">Priority<select value={value.priority} onChange={(event) => set("priority", event.target.value as MaintenancePriority)} className={`${fieldClass()} h-11`}><option>CRITICAL</option><option>HIGH</option><option>MEDIUM</option><option>LOW</option></select></label></div>
        <label className="block text-sm font-semibold text-slate-800">Scheduled Date & Time<input type="datetime-local" value={value.scheduledFor} onChange={(event) => set("scheduledFor", event.target.value)} className={`${fieldClass(errors.scheduledFor)} h-11`} />{errors.scheduledFor && <span className="mt-1 block text-xs text-red-600">{errors.scheduledFor}</span>}</label>
        <footer className="flex justify-end gap-3 border-t border-slate-200 pt-5"><button type="button" onClick={onClose} disabled={saving} className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-bold text-slate-700">Cancel</button><button type="submit" disabled={saving} className="h-10 rounded-lg bg-cyan-700 px-5 text-sm font-bold text-white hover:bg-cyan-800 disabled:opacity-60">{saving ? "Creating..." : "Create Task"}</button></footer>
      </form>
    </section>
  </div>;
}

