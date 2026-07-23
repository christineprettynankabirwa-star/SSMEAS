"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import AppShell from "@/components/ui/AppShell";
import type { NotificationItem, NotificationPreferences } from "@/components/dashboard/types";
import { useApiSession } from "@/components/operations/useApiSession";
import {
  getNotificationPreferences, getNotifications, markAllNotificationsRead,
  markNotificationRead, testNotificationEmail, testNotificationSms,
  updateNotificationPreferences,
} from "@/services/api";

const preferenceFields: Array<[keyof Pick<NotificationPreferences,
  "email_enabled" | "sms_enabled" | "dashboard_enabled" | "critical_only" |
  "warning_enabled" | "daily_summary">, string]> = [
  ["dashboard_enabled", "Dashboard notifications"],
  ["email_enabled", "Email notifications"],
  ["sms_enabled", "SMS notifications"],
  ["critical_only", "Critical alerts only"],
  ["warning_enabled", "Warning alerts"],
  ["daily_summary", "Daily summary"],
];
const tones = { critical: "bg-red-100 text-red-800", warning: "bg-amber-100 text-amber-800", info: "bg-emerald-100 text-emerald-800" };

export default function NotificationsPageClient() {
  const ready = useApiSession();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [history, settings] = await Promise.all([getNotifications(), getNotificationPreferences()]);
    setItems(history); setPreferences(settings); setLoading(false);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [ready, load]);

  if (ready !== true) return null;
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!preferences) return;
    const { email_enabled, sms_enabled, dashboard_enabled, critical_only, warning_enabled, daily_summary } = preferences;
    setPreferences(await updateNotificationPreferences({ email_enabled, sms_enabled, dashboard_enabled, critical_only, warning_enabled, daily_summary }));
    setMessage("Notification preferences saved.");
  };
  const read = async (item: NotificationItem) => {
    if (item.read_at) return;
    const changed = await markNotificationRead(item.id);
    setItems((current) => current.map((value) => value.id === item.id ? changed : value));
  };
  const readAll = async () => {
    await markAllNotificationsRead();
    const now = new Date().toISOString();
    setItems((current) => current.map((item) => ({ ...item, status: "READ", read_at: item.read_at ?? now })));
  };
  const test = async (channel: "email" | "sms") => {
    try {
      const result = channel === "email" ? await testNotificationEmail() : await testNotificationSms();
      setMessage(result.message);
    } catch {
      setMessage(`Unable to send the ${channel.toUpperCase()} test. Check your preference and provider configuration.`);
    }
  };

  return <AppShell><main className="mx-auto max-w-[1400px] space-y-6 p-5 sm:p-8">
    <header className="flex flex-wrap items-end justify-between gap-4 pt-12">
      <div><p className="text-xs font-black uppercase tracking-[.18em] text-cyan-700">Communication centre</p><h1 className="mt-2 text-3xl font-black text-slate-950">Notification history</h1><p className="mt-2 text-sm text-slate-500">Alert delivery history is retained permanently.</p></div>
      <button type="button" onClick={() => void readAll()} className="rounded-xl bg-cyan-700 px-4 py-2 text-sm font-bold text-white">Mark all read</button>
    </header>
    {message && <div className="rounded-xl bg-cyan-50 p-3 text-sm text-cyan-900">{message}</div>}
    <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {loading ? <div className="h-60 animate-pulse rounded-xl bg-slate-100" /> : items.length ? <div className="space-y-3">{items.map((item) =>
          <button type="button" key={item.id} onClick={() => void read(item)} className={`block w-full rounded-xl border p-4 text-left ${item.read_at ? "border-slate-200 bg-slate-50 opacity-70" : "border-cyan-200 bg-white shadow-sm"}`}>
            <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${tones[item.severity]}`}>{item.severity}</span><strong className="text-sm text-slate-950">{item.subject}</strong><span className="ml-auto text-[10px] font-bold text-slate-400">{item.read_at ? "READ" : "UNREAD"}</span></div>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">{item.message}</p>
            <p className="mt-3 text-xs text-slate-400">{new Date(item.created_at).toLocaleString("en-UG")}</p>
          </button>)}</div> : <p className="p-16 text-center text-sm text-slate-500">No notifications have been recorded.</p>}
      </section>
      {preferences && <form onSubmit={(event) => void save(event)} className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-black text-slate-950">Preferences</h2><p className="mt-1 text-xs text-slate-500">Choose how alerts reach you.</p>
        <div className="mt-5 space-y-3">{preferenceFields.map(([field, label]) => <label key={field} className="flex items-center justify-between gap-4 text-sm text-slate-700"><span>{label}</span><input type="checkbox" checked={preferences[field]} onChange={(event) => setPreferences({ ...preferences, [field]: event.target.checked })} className="size-4 accent-cyan-700" /></label>)}</div>
        <button type="submit" className="mt-5 w-full rounded-xl bg-cyan-700 px-4 py-2 text-sm font-bold text-white">Save preferences</button>
        <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => void test("email")} className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-bold">Test email</button><button type="button" onClick={() => void test("sms")} className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-bold">Test SMS</button></div>
      </form>}
    </div>
  </main></AppShell>;
}

