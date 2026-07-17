import { useEffect, useState } from "react";

const formatTime = (date: Date) => new Intl.DateTimeFormat("en-UG", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(date);

export default function DashboardHeader({ lastUpdated, onSignOut }: { lastUpdated: Date | null; onSignOut: () => void }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { const update = () => setNow(new Date()); update(); const id = window.setInterval(update, 1000); return () => window.clearInterval(id); }, []);
  return <header className="fixed inset-x-0 top-0 z-[1000] border-b border-blue-800 bg-[#1E3A8A] text-white shadow-lg shadow-blue-950/10">
    <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/15 text-lg font-black ring-1 ring-white/20">S</span><div className="min-w-0"><h1 className="truncate text-sm font-bold sm:text-base">SSMEAS SewerGuard Dashboard</h1><p className="hidden text-[11px] text-blue-200 sm:block">Operations control centre</p></div></div>
      <div className="flex items-center gap-2 sm:gap-4"><div className="hidden text-right md:block"><p className="text-xs font-medium text-blue-100">{now ? formatTime(now) : "--:--:--"}</p><p className="text-[10px] text-blue-300">Updated {lastUpdated ? formatTime(lastUpdated) : "waiting"}</p></div><span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/20">Admin</span><button type="button" onClick={onSignOut} className="rounded-lg bg-blue-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-white">Logout</button></div>
    </div>
  </header>;
}
