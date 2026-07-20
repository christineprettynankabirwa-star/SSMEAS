"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const items = [
  { href: "/#overview", label: "Overview", icon: "⌂", section: "overview" },
  { href: "/#tanks", label: "Tanks", icon: "▦", section: "tanks" },
  { href: "/#analytics", label: "Analytics", icon: "⌁", section: "analytics" },
  { href: "/#locations", label: "Map", icon: "⌖", section: "locations" },
  { href: "/#alerts", label: "Alerts", icon: "!", section: "alerts" },
  { href: "/#maintenance", label: "Maintenance", icon: "✓", section: "maintenance" },
  { href: "/#route", label: "Route", icon: "↗", section: "route" },
];

export default function NavBar() {
  const pathname = usePathname();
  const [hash, setHash] = useState("overview");
  useEffect(() => {
    const update = () => setHash(window.location.hash.slice(1) || "overview");
    update(); window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, [pathname]);
  return <><aside className="fixed inset-y-0 left-0 z-[1100] hidden w-60 border-r border-slate-800 bg-slate-950 text-white lg:block"><div className="flex h-full flex-col p-5"><Link href="/" className="flex items-center gap-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400"><span className="grid size-10 place-items-center rounded-xl bg-cyan-400 text-lg font-black text-slate-950">S</span><div><p className="font-bold tracking-wide">SSMEAS</p><p className="text-xs text-slate-400">Operations Centre</p></div></Link><nav aria-label="Primary navigation" className="mt-8 space-y-1">{items.map((item) => { const active = pathname.startsWith("/tanks/") ? item.section === "tanks" : pathname === "/" && hash === item.section; return <Link key={item.section} href={item.href} aria-current={active ? "page" : undefined} className={`ui-nav-link flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${active ? "bg-cyan-400/15 text-cyan-300 ring-1 ring-inset ring-cyan-400/20" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}><span className="grid w-5 place-items-center text-base text-cyan-400" aria-hidden="true">{item.icon}</span>{item.label}</Link>; })}</nav><div className="mt-auto border-t border-slate-800 pt-5"><p className="flex items-center gap-2 text-xs font-semibold text-emerald-400"><span className="size-2 rounded-full bg-emerald-400"/>Monitoring active</p><p className="mt-3 text-xs leading-5 text-slate-500">Smart sewer monitoring and early alerts.</p></div></div></aside><nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-[1200] flex overflow-x-auto border-t border-slate-200 bg-white/95 px-2 py-2 shadow-[0_-8px_24px_rgb(15_23_42_/.08)] backdrop-blur lg:hidden">{items.map((item) => { const active = pathname.startsWith("/tanks/") ? item.section === "tanks" : pathname === "/" && hash === item.section; return <Link key={item.section} href={item.href} aria-current={active ? "page" : undefined} className={`ui-nav-link flex min-w-16 flex-1 flex-col items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold ${active ? "bg-cyan-50 text-cyan-800" : "text-slate-500"}`}><span className="text-base" aria-hidden="true">{item.icon}</span>{item.label}</Link>; })}</nav></>;
}
