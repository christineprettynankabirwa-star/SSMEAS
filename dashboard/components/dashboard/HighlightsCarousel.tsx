"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { AlertItem, MaintenanceItem, OptimizedRoute, SensorReading, Tank } from "./types";

interface Props { tanks: Tank[]; readings: SensorReading[]; alerts: AlertItem[]; maintenance: MaintenanceItem[]; route: OptimizedRoute | null; }
export default function HighlightsCarousel({ tanks, readings, alerts, maintenance, route }: Props) {
  const [index, setIndex] = useState(0); const [paused, setPaused] = useState(false);
  const slides = useMemo(() => {
    const byTank = new Map(readings.map((reading) => [reading.tank_id, reading]));
    const fullest = tanks.map((tank) => ({ tank, reading: byTank.get(tank.id) })).filter((item) => item.reading?.level != null).sort((a, b) => (b.reading!.level ?? 0) - (a.reading!.level ?? 0))[0];
    const latestAlert = [...alerts].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))[0];
    const nextJob = [...maintenance].filter((item) => item.status !== "COMPLETED").sort((a, b) => +new Date(a.scheduled_for) - +new Date(b.scheduled_for))[0];
    return [
      fullest && { id: `tank-${fullest.tank.id}`, eyebrow: "Capacity watch", title: fullest.tank.tank_name, value: `${fullest.reading!.level!.toFixed(1)}% full`, detail: fullest.tank.location, tone: "from-cyan-500 to-blue-700", href: `/tanks/${fullest.tank.id}` },
      latestAlert && { id: `alert-${latestAlert.id}`, eyebrow: `${latestAlert.severity} alert`, title: latestAlert.alert_type, value: latestAlert.tank_name, detail: latestAlert.message, tone: latestAlert.severity === "critical" ? "from-red-500 to-rose-800" : "from-amber-400 to-orange-700", href: `/tanks/${latestAlert.tank_id}` },
      nextJob && { id: `job-${nextJob.id}`, eyebrow: "Upcoming maintenance", title: nextJob.task, value: nextJob.tank_name, detail: new Date(nextJob.scheduled_for).toLocaleString(), tone: "from-emerald-500 to-teal-800", href: `/tanks/${nextJob.tank_id}` },
      route?.stops[0] && { id: `route-${route.stops[0].tankId}`, eyebrow: "Next collection stop", title: route.stops[0].tankName, value: `${route.stops[0].priority} priority`, detail: `${route.totalDistanceKm.toFixed(1)} km optimized route`, tone: "from-violet-500 to-indigo-800", href: "/route" },
    ].filter((slide): slide is NonNullable<typeof slide> => Boolean(slide));
  }, [alerts, maintenance, readings, route, tanks]);
  const active = slides.length ? index % slides.length : 0;
  useEffect(() => { if (paused || slides.length < 2) return; const id = window.setInterval(() => setIndex((value) => value + 1), 5_000); return () => window.clearInterval(id); }, [paused, slides.length]);
  if (slides.length === 0) return null;
  const slide = slides[active]!;
  const move = (step: number) => setIndex((value) => (value + step + slides.length) % slides.length);
  return <section aria-roledescription="carousel" aria-label="Operational highlights" className="group relative overflow-hidden rounded-2xl border border-cyan-400/15 bg-slate-950/80 text-white shadow-[0_20px_60px_rgb(0_0_0/.3)]" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)}><div key={slide.id} className={`ui-slide-enter min-h-52 bg-gradient-to-br ${slide.tone} p-6 sm:p-8`}><p className="text-xs font-bold uppercase tracking-[.18em] text-white/75">{slide.eyebrow}</p><div className="mt-4 max-w-2xl"><h2 className="text-2xl font-bold sm:text-3xl">{slide.title}</h2><p className="mt-2 text-lg font-semibold text-white/95">{slide.value}</p><p className="mt-2 line-clamp-2 text-sm text-white/75">{slide.detail}</p><Link href={slide.href} className="ui-button mt-5 inline-flex rounded-lg bg-white/15 px-4 py-2 text-sm font-bold ring-1 ring-white/30 backdrop-blur hover:bg-white/25">View details →</Link></div></div>{slides.length > 1 && <><button type="button" onClick={() => move(-1)} aria-label="Previous highlight" className="ui-button absolute left-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-slate-950/35 text-xl backdrop-blur hover:bg-slate-950/60">‹</button><button type="button" onClick={() => move(1)} aria-label="Next highlight" className="ui-button absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-slate-950/35 text-xl backdrop-blur hover:bg-slate-950/60">›</button><div className="absolute bottom-4 right-5 flex gap-2">{slides.map((item, itemIndex) => <button key={item.id} type="button" aria-label={`Show highlight ${itemIndex + 1}`} aria-current={itemIndex === active} onClick={() => setIndex(itemIndex)} className={`ui-button h-2 rounded-full ${itemIndex === active ? "w-6 bg-white" : "w-2 bg-white/45 hover:bg-white/75"}`} />)}</div></>}</section>;
}
