"use client";

import type { ReactNode } from "react";
import AppShell from "@/components/ui/AppShell";

export function ModuleScaffold({ title, eyebrow, description, children, actions }: { title: string; eyebrow: string; description: string; children: ReactNode; actions?: ReactNode }) {
  return <AppShell><main className="min-h-screen px-4 py-7 sm:px-6 lg:px-8"><div className="mx-auto max-w-[1600px]"><header className="relative mb-7 overflow-hidden rounded-2xl border border-cyan-400/15 bg-slate-950/75 px-6 py-8 text-white shadow-[0_20px_60px_rgb(0_0_0/.28)] backdrop-blur-xl sm:flex sm:items-end sm:justify-between"><div className="absolute -right-24 -top-24 size-64 rounded-full bg-cyan-400/10 blur-3xl"/><div className="relative"><p className="text-xs font-bold uppercase tracking-[.22em] text-cyan-400">{eyebrow}</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{title}</h1><p className="mt-2 max-w-3xl text-sm text-slate-300">{description}</p></div><div className="relative mt-4 sm:mt-0">{actions}</div></header>{children}</div></main></AppShell>;
}

export function ModuleError({ message, retry }: { message: string; retry?: () => void }) { return <div role="alert" className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-5 text-sm text-rose-200 shadow-[0_0_30px_rgb(251_113_133/.06)]"><p>{message}</p>{retry && <button onClick={retry} className="ui-button mt-3 rounded-lg bg-rose-500/20 px-3 py-2 font-bold text-rose-100 ring-1 ring-rose-400/30">Retry</button>}</div>; }
export function ModuleLoading() { return <div aria-label="Loading" className="grid gap-4 md:grid-cols-3">{[1,2,3,4,5,6].map((key) => <div key={key} className="h-36 animate-pulse rounded-2xl border border-white/5 bg-slate-800/70" />)}</div>; }
