const navItems = [
  { href: "#overview", label: "Overview", icon: "▦" },
  { href: "#tanks", label: "Tanks", icon: "◉" },
  { href: "#analytics", label: "Analytics", icon: "↗" },
  { href: "#locations", label: "Locations", icon: "⌖" },
  { href: "#operations", label: "Operations", icon: "≡" },
];

export default function OperationsNav({ onSignOut }: { onSignOut: () => void }) {
  return (
    <aside className="border-b border-slate-200 bg-white text-slate-900 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
      <div className="flex h-full flex-col px-4 py-5 lg:px-5 lg:py-7">
        <div className="flex items-center justify-between lg:block">
          <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-cyan-500 text-lg font-black text-slate-950">S</span><div><p className="font-bold tracking-wide">SSMEAS</p><p className="text-xs text-slate-400">Operations Centre</p></div></div>
          <span className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 lg:mt-7 lg:w-fit"><span className="size-2 rounded-full bg-emerald-400" />System online</span>
        </div>
        <nav aria-label="Dashboard sections" className="mt-5 flex gap-2 overflow-x-auto pb-1 lg:mt-8 lg:flex-col lg:overflow-visible">
          {navItems.map((item, index) => <a key={item.href} href={item.href} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-cyan-50 hover:text-cyan-900 ${index === 0 ? "bg-cyan-50 text-cyan-800 ring-1 ring-inset ring-cyan-200" : "text-slate-600"}`}><span aria-hidden="true" className="w-5 text-center text-base text-cyan-300">{item.icon}</span>{item.label}</a>)}
        </nav>
        <div className="mt-auto hidden border-t border-slate-200 pt-5 lg:block"><button type="button" onClick={onSignOut} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-900">Sign out</button><p className="mt-4 text-xs leading-5 text-slate-500">Smart sewage monitoring and environmental alerts.</p></div>
      </div>
    </aside>
  );
}
