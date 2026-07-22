"use client";

import type { ReactNode } from "react";
import AppShell from "@/components/ui/AppShell";

export function ModuleScaffold({ title, eyebrow, description, children, actions }: { title: string; eyebrow: string; description: string; children: ReactNode; actions?: ReactNode }) {
  return <AppShell><main className="min-h-screen bg-[#f3f4f6] px-4 py-7 sm:px-6 lg:px-8"><div className="mx-auto max-w-[1600px]"><header className="mb-6 flex flex-col gap-4 rounded-2xl bg-slate-950 px-6 py-7 text-white shadow-xl sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.22em] text-cyan-400">{eyebrow}</p><h1 className="mt-2 text-3xl font-black tracking-tight">{title}</h1><p className="mt-2 max-w-3xl text-sm text-slate-300">{description}</p></div>{actions}</header>{children}</div></main></AppShell>;
}

export function ModuleError({ message, retry }: { message: string; retry?: () => void }) { return <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800"><p>{message}</p>{retry && <button onClick={retry} className="mt-3 rounded-lg bg-rose-700 px-3 py-2 font-bold text-white">Retry</button>}</div>; }
export function ModuleLoading() { return <div aria-label="Loading" className="grid gap-4 md:grid-cols-3">{[1,2,3,4,5,6].map((key) => <div key={key} className="h-36 animate-pulse rounded-2xl bg-slate-200" />)}</div>; }
