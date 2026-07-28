"use client";

import { useState } from "react";
import type { MaintenanceItem } from "@/components/dashboard/types";

export default function ConfirmTaskDeleteModal({ item, onClose, onConfirm }: { item: MaintenanceItem; onClose: () => void; onConfirm: () => Promise<void> }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const confirm = async () => {
    setDeleting(true); setError("");
    try { await onConfirm(); }
    catch { setError("The maintenance task could not be deleted."); setDeleting(false); }
  };
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !deleting) onClose(); }}><section role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl"><div className="mb-4 grid h-11 w-11 place-items-center rounded-full bg-red-100 font-black text-red-700">!</div><h2 className="text-xl font-bold text-slate-900">Delete maintenance task?</h2><p className="mt-2 text-sm leading-6 text-slate-600">Delete <strong>{item.task}</strong> for <strong>{item.tank_name}</strong>? This action cannot be undone.</p>{error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<footer className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} disabled={deleting} className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-bold text-slate-700">Cancel</button><button type="button" onClick={() => void confirm()} disabled={deleting} className="h-10 rounded-lg bg-red-700 px-4 text-sm font-bold text-white disabled:opacity-60">{deleting ? "Deleting..." : "Delete Task"}</button></footer></section></div>;
}
