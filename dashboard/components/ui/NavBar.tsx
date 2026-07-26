"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/auth/AuthContext";
import type { UiPermission } from "@/auth/permissions";

const items: Array<{ href: string; label: string; icon: string; permission: UiPermission }> = [
  { href: "/", label: "Overview", icon: "⌂", permission: "overview" },
  { href: "/tanks", label: "Tanks", icon: "▦", permission: "tanks" },
  { href: "/analytics", label: "Analytics", icon: "⌁", permission: "analytics" },
  { href: "/map", label: "Map", icon: "⌖", permission: "map" },
  { href: "/alerts", label: "Alerts", icon: "!", permission: "alerts" },
  { href: "/notifications", label: "Notifications", icon: "●", permission: "notifications" },
  { href: "/maintenance", label: "Maintenance", icon: "✓", permission: "maintenance" },
  { href: "/route", label: "Route", icon: "↗", permission: "routes" },
  { href: "/reports", label: "Reports", icon: "▤", permission: "reports" },
  { href: "/users", label: "Users", icon: "♟", permission: "users" },
  { href: "/settings", label: "Settings", icon: "⚙", permission: "settings" },
];

export default function NavBar() {
  const pathname = usePathname();
  const { user, can } = useAuth();
  const visible = items.filter(({ permission }) => can(permission));
  const active = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);
  const links = (mobile = false) => visible.map((item) => <Link key={item.href} href={item.href}
    aria-current={active(item.href) ? "page" : undefined}
    className={mobile
      ? `ui-nav-link flex min-w-16 flex-1 flex-col items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold ${active(item.href) ? "bg-cyan-50 text-cyan-800" : "text-slate-400"}`
      : `ui-nav-link flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${active(item.href) ? "bg-cyan-50 text-cyan-800 ring-1 ring-inset ring-cyan-200" : "text-slate-600 hover:bg-cyan-50 hover:text-cyan-900"}`}>
    <span className={mobile ? "text-base" : "grid w-5 place-items-center text-base text-cyan-500"} aria-hidden="true">{item.icon}</span>
    {item.label}
  </Link>);

  return <>
    <aside className="fixed inset-y-0 left-0 z-[1100] hidden w-60 border-r border-slate-200/80 bg-white/90 text-slate-900 shadow-[12px_0_40px_rgb(35_76_96/.08)] backdrop-blur-xl lg:block">
      <div className="flex h-full flex-col p-5">
        <Link href="/" className="flex items-center gap-3 rounded-xl">
          <span className="grid size-10 place-items-center rounded-xl bg-cyan-400 text-lg font-black text-slate-950">S</span>
          <div><p className="font-bold tracking-wide">SSMEAS</p><p className="text-xs text-slate-500">Operations Centre</p></div>
        </Link>
        <nav aria-label="Primary navigation" className="mt-8 space-y-1">{links()}</nav>
        <div className="mt-auto border-t border-slate-200 pt-5">
          <p className="text-xs font-bold text-slate-700">{user?.full_name}</p>
          <p className="mt-1 text-[10px] font-semibold text-cyan-700">{user?.role.replaceAll("_", " ")}</p>
        </div>
      </div>
    </aside>
    <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-[1200] flex overflow-x-auto border-t border-slate-200 bg-white/95 px-2 py-2 lg:hidden">{links(true)}</nav>
  </>;
}
