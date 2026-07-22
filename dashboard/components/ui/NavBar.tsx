"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Overview", icon: "⌂" },
  { href: "/tanks", label: "Tanks", icon: "▦" },
  { href: "/analytics", label: "Analytics", icon: "⌁" },
  { href: "/map", label: "Map", icon: "⌖" },
  { href: "/alerts", label: "Alerts", icon: "!" },
  { href: "/maintenance", label: "Maintenance", icon: "✓" },
  { href: "/route", label: "Route", icon: "↗" },
];

export default function NavBar() {
  const pathname = usePathname();
  const active = (href: string) => href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  const links = (mobile = false) => items.map((item) => <Link key={item.href} href={item.href} aria-current={active(item.href) ? "page" : undefined} className={mobile
    ? `ui-nav-link flex min-w-16 flex-1 flex-col items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold ${active(item.href) ? "bg-cyan-50 text-cyan-800" : "text-slate-400"}`
    : `ui-nav-link flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${active(item.href) ? "bg-cyan-400/15 text-cyan-300 ring-1 ring-inset ring-cyan-400/20" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}>
    <span className={mobile ? "text-base" : "grid w-5 place-items-center text-base text-cyan-400"} aria-hidden="true">{item.icon}</span>{item.label}
  </Link>);
  return <><aside className="fixed inset-y-0 left-0 z-[1100] hidden w-60 border-r border-cyan-400/10 bg-[#070b14]/95 shadow-[12px_0_40px_rgb(0_0_0/.24)] backdrop-blur-xl text-white lg:block"><div className="flex h-full flex-col p-5"><Link href="/" className="flex items-center gap-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400"><span className="grid size-10 place-items-center rounded-xl bg-cyan-400 text-lg font-black text-slate-950">S</span><div><p className="font-bold tracking-wide">SSMEAS</p><p className="text-xs text-slate-400">Operations Centre</p></div></Link><nav aria-label="Primary navigation" className="mt-8 space-y-1">{links()}</nav><div className="mt-auto border-t border-slate-800 pt-5"><p className="flex items-center gap-2 text-xs font-semibold text-emerald-400"><span className="size-2 rounded-full bg-emerald-400"/>Monitoring active</p><p className="mt-3 text-xs leading-5 text-slate-500">Smart sewer monitoring and early alerts.</p></div></div></aside><nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-[1200] flex overflow-x-auto border-t border-white/10 bg-slate-950/95 px-2 py-2 shadow-[0_-8px_24px_rgb(15_23_42_/.08)] backdrop-blur lg:hidden">{links(true)}</nav></>;
}
