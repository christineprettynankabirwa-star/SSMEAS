"use client";

import type { ReactNode } from "react";
import AppShell from "@/components/ui/AppShell";

export function ModuleScaffold({ title, eyebrow, description, children, actions }: { title: string; eyebrow: string; description: string; children: ReactNode; actions?: ReactNode }) {
  return <AppShell><main className="min-h-screen px-4 py-7 sm:px-6 lg:px-8"><div className="mx-auto max-w-[1600px]"><header className="relative mb-7 overflow-hidden rounded-2xl border border-cyan-700/15 bg-white/85 px-6 py-8 text-slate-950 shadow-[0_18px_48px_rgb(35_76_96/.1)] backdrop-blur-xl sm:flex sm:items-end sm:justify-between"><div className="absolute -right-24 -top-24 size-64 rounded-full bg-cyan-400/15 blur-3xl"/><div className="relative"><p className="text-xs font-bold uppercase tracking-[.22em] text-cyan-700">{eyebrow}</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{title}</h1><p className="mt-2 max-w-3xl text-sm text-slate-600">{description}</p></div><div className="relative mt-4 sm:mt-0">{actions}</div></header>{children}</div></main></AppShell>;
}

export function ModuleError({ message, retry }: { message: string; retry?: () => void }) { return <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800 shadow-sm"><p>{message}</p>{retry && <button onClick={retry} className="ui-button mt-3 rounded-lg bg-rose-700 px-3 py-2 font-bold text-white shadow-sm">Retry</button>}</div>; }
export function ModuleLoading() { return <div aria-label="Loading" className="grid gap-4 md:grid-cols-3">{[1,2,3,4,5,6].map((key) => <div key={key} className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-slate-200/70" />)}</div>; }
