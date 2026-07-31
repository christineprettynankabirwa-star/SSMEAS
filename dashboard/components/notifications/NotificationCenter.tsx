"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { NotificationItem } from "@/components/dashboard/types";
import {
  deleteNotification, getUnreadNotifications, markAllNotificationsRead, markNotificationRead,
} from "@/services/api";
import { useAuth } from "@/auth/AuthContext";
import { subscribeDataRefresh } from "@/services/data-refresh";

const tone = {
  critical: "border-red-300 bg-red-50 text-red-900",
  warning: "border-amber-300 bg-amber-50 text-amber-900",
  info: "border-emerald-300 bg-emerald-50 text-emerald-900",
};
const isResolution = (item: NotificationItem): boolean => item.subject.startsWith("Resolved - ");
const isAcknowledgement = (item: NotificationItem): boolean =>
  item.subject.startsWith("Acknowledged - ");

export default function NotificationCenter() {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<NotificationItem | null>(null);
  const initialized = useRef(false);
  const known = useRef(new Set<string>());

  const load = useCallback(async () => {
    try {
      const unread = await getUnreadNotifications();
      if (initialized.current) {
        const newest = unread.find((item) => !known.current.has(item.id));
        if (newest && !isAcknowledgement(newest)) setToast(newest);
      }
      unread.forEach((item) => known.current.add(item.id));
      initialized.current = true;
      setItems(unread);
    } catch {
      // Authentication is initialized by the page-level session before polling succeeds.
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(), 3_000);
    const unsubscribe = subscribeDataRefresh(() => void load());
    return () => { window.clearTimeout(initial); window.clearInterval(interval); unsubscribe(); };
  }, [load]);
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 8_000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const read = async (item: NotificationItem) => {
    await markNotificationRead(item.id);
    setItems((current) => current.filter(({ id }) => id !== item.id));
  };
  const readAll = async () => {
    await markAllNotificationsRead();
    setItems([]);
  };
  const clear = async (id: string) => {
    try {
      await deleteNotification(id);
      setItems((current) => current.filter(({ id: nid }) => nid !== id));
    } catch { /* notification may have been removed already */ }
  };

  return <>
    <button type="button" aria-label="Open notifications" onClick={() => setOpen((value) => !value)}
      className="fixed right-24 top-3 z-[1100] grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-xl shadow-lg hover:bg-slate-50">
      🔔
      {items.length > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1 text-center text-[10px] font-black leading-5 text-white">{items.length > 99 ? "99+" : items.length}</span>}
    </button>
    {open && <div className="fixed right-3 top-16 z-[1100] w-[min(26rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-100 p-4">
        <div><h2 className="font-black text-slate-950">Notifications</h2><p className="text-xs text-slate-500">{items.length} unread</p></div>
        <button type="button" disabled={!items.length} onClick={() => void readAll()} className="text-xs font-bold text-cyan-700 disabled:text-slate-300">Mark all read</button>
      </div>
      <div className="max-h-[28rem] overflow-y-auto p-3">
        {items.length ? items.map((item) => <div key={item.id} className="relative mb-2">
          <button type="button" onClick={() => void read(item)}
            className={`block w-full rounded-xl border p-3 pr-8 text-left ${isResolution(item) || isAcknowledgement(item) ? tone.info : tone[item.severity]}`}>
            <span className="text-[10px] font-black uppercase tracking-wider">{isResolution(item) ? "resolved" : isAcknowledgement(item) ? "acknowledged" : item.severity}</span>
            <strong className="mt-1 block text-sm">{item.tank_name}</strong>
            <span className="mt-1 line-clamp-2 block whitespace-pre-line text-xs opacity-80">{item.message}</span>
            <span className="mt-2 block text-[10px] opacity-60">{new Date(item.created_at).toLocaleString("en-UG")} · click to mark read</span>
          </button>
          {user?.role === "ADMINISTRATOR" && <button type="button" onClick={(event) => { event.stopPropagation(); void clear(item.id); }}
            className="absolute right-2 top-2 grid size-5 place-items-center rounded-full text-xs text-slate-400 hover:bg-slate-200 hover:text-slate-700"
            aria-label="Dismiss notification">×</button>}
        </div>) : <p className="p-8 text-center text-sm text-slate-500">You are all caught up.</p>}
      </div>
      <Link href="/notifications" onClick={() => setOpen(false)} className="block border-t border-slate-100 p-3 text-center text-sm font-bold text-cyan-700">View notification history and preferences</Link>
    </div>}
    {toast && <div role="alert" className={`fixed bottom-5 right-5 z-[1200] w-[min(24rem,calc(100vw-2.5rem))] rounded-2xl border p-5 shadow-2xl ${isResolution(toast) ? tone.info : tone[toast.severity]}`}>
      <button type="button" aria-label="Dismiss notification" onClick={() => setToast(null)} className="float-right text-lg text-slate-400 hover:text-slate-700">×</button>
      <p className="text-xs font-black uppercase tracking-wider">{toast.severity === "critical" ? "🔴 Critical Alert" : toast.severity === "warning" ? "🟡 Warning Alert" : "🔵 Information Alert"}</p>
      <h2 className="mt-2 text-lg font-black">{isResolution(toast) ? `${toast.tank_name} restored to SAFE` : toast.severity === "critical" ? `Critical sewer alert detected at ${toast.tank_name}` : toast.tank_name}</h2>
      <p className="mt-2 whitespace-pre-line text-sm leading-6">{toast.message}</p>
    </div>}
  </>;
}
