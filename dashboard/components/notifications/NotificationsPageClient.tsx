"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import AppShell from "@/components/ui/AppShell";
import type { NotificationItem, NotificationPreferences } from "@/components/dashboard/types";
import { useApiSession } from "@/components/operations/useApiSession";
import { apiErrorMessage } from "@/components/admin/userManagement";
import {
  deleteNotification, getNotificationPreferences, getNotifications,
  markAllNotificationsRead, markNotificationRead, testNotificationEmail,
  updateNotificationPreferences,
} from "@/services/api";

const preferenceFields: Array<[keyof Pick<NotificationPreferences,
  "email_enabled" | "sms_enabled" | "in_app_enabled" | "critical_only" |
  "warning_enabled" | "daily_summary">, string]> = [
  ["in_app_enabled", "In-app notifications"],
  ["email_enabled", "Email notifications"],
  ["sms_enabled", "SMS via SIM800 Field Device"],
  ["critical_only", "Critical alerts only"],
  ["warning_enabled", "Warning alerts"],
  ["daily_summary", "Daily summary"],
];
const severityTone = { critical: "bg-red-100 text-red-800", warning: "bg-amber-100 text-amber-800", info: "bg-emerald-100 text-emerald-800" };
const channelLabel: Record<NotificationItem["channel"], string> = {
  IN_APP: "In-app", EMAIL: "Email", SMS_DEVICE: "SMS (SIM800)", SMS_CLOUD: "Cloud SMS",
};
const deliveryLabel = (item: NotificationItem): string => {
  if (item.channel === "SMS_DEVICE" && item.status === "SENT") return "Sent by field device";
  if (item.channel === "IN_APP") return item.read_at ? "Read" : "Unread";
  return item.status === "SENT" ? "Sent" : item.status === "FAILED" ? "Failed" : "Pending";
};

export default function NotificationsPageClient() {
  const ready = useApiSession();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [testingEmail, setTestingEmail] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [history, settings] = await Promise.all([getNotifications(), getNotificationPreferences()]);
      setItems(history); setPreferences(settings);
    } catch (error) {
      setMessage({ tone: "error", text: apiErrorMessage(error, "Notification history could not be loaded.") });
    } finally { setLoading(false); }
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
    const { email_enabled, sms_enabled, in_app_enabled, critical_only, warning_enabled, daily_summary } = preferences;
    try {
      setPreferences(await updateNotificationPreferences({ email_enabled, sms_enabled, in_app_enabled, critical_only, warning_enabled, daily_summary }));
      setMessage({ tone: "success", text: "Notification preferences saved." });
    } catch (error) {
      setMessage({ tone: "error", text: apiErrorMessage(error, "Notification preferences could not be saved.") });
    }
  };
  const read = async (item: NotificationItem) => {
    if (item.channel !== "IN_APP" || item.read_at) return;
    try {
      const changed = await markNotificationRead(item.id);
      setItems((current) => current.map((value) => value.id === item.id ? changed : value));
    } catch (error) {
      setMessage({ tone: "error", text: apiErrorMessage(error, "The notification could not be marked as read.") });
    }
  };
  const readAll = async () => {
    try {
      await markAllNotificationsRead();
      const now = new Date().toISOString();
      setItems((current) => current.map((item) => item.channel === "IN_APP" ? { ...item, read_at: item.read_at ?? now } : item));
    } catch (error) {
      setMessage({ tone: "error", text: apiErrorMessage(error, "Notifications could not be marked as read.") });
    }
  };
  const clear = async (id: string) => {
    try {
      await deleteNotification(id);
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      setMessage({ tone: "error", text: apiErrorMessage(error, "The notification could not be dismissed.") });
    }
  };
  const testEmail = async () => {
    setTestingEmail(true);
    try {
      const result = await testNotificationEmail();
      setMessage({ tone: "success", text: result.message });
    } catch (error) {
      setMessage({ tone: "error", text: apiErrorMessage(error, "Unable to send the email test. Check the email preference and SMTP configuration.") });
    } finally { setTestingEmail(false); }
  };

  return <AppShell><main className="mx-auto max-w-[1400px] space-y-6 p-5 sm:p-8">
    <header className="flex flex-wrap items-end justify-between gap-4 pt-12"><div><p className="text-xs font-black uppercase tracking-[.18em] text-cyan-700">Communication centre</p><h1 className="mt-2 text-3xl font-black text-slate-950">Notification history</h1><p className="mt-2 text-sm text-slate-500">Alert delivery history is retained across dashboard, email, and field-device channels.</p></div><button type="button" onClick={() => void readAll()} className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-bold text-white">Mark all read</button></header>
    {message && <div role={message.tone === "error" ? "alert" : "status"} className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium ${message.tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-cyan-200 bg-cyan-50 text-cyan-900"}`}><span>{message.text}</span><button type="button" onClick={() => setMessage(null)} aria-label="Dismiss message" className="ml-4 text-lg">×</button></div>}
    <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        {loading ? <div className="space-y-3">{[1, 2, 3].map((key) => <div key={key} className="h-28 animate-pulse rounded-lg bg-slate-100" />)}</div> : items.length ? <div className="space-y-3">{items.map((item) =>
          <article key={item.id} className={`relative rounded-lg border p-4 pr-10 ${item.channel === "IN_APP" && !item.read_at ? "border-cyan-200 bg-white shadow-sm" : "border-slate-200 bg-slate-50"}`}>
            <button type="button" disabled={item.channel !== "IN_APP" || Boolean(item.read_at)} onClick={() => void read(item)} className="block w-full text-left disabled:cursor-default">
              <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${severityTone[item.severity]}`}>{item.severity}</span><span className="rounded-full bg-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700">{channelLabel[item.channel]}</span><strong className="text-sm text-slate-950">{item.subject}</strong><span className="ml-auto text-[10px] font-bold uppercase text-slate-500">{deliveryLabel(item)}</span></div>
              <dl className="mt-3 grid gap-1 text-xs text-slate-500 sm:grid-cols-2"><div><dt className="inline font-semibold">Recipient: </dt><dd className="inline">{item.recipient}</dd></div><div><dt className="inline font-semibold">Timestamp: </dt><dd className="inline">{new Date(item.sent_at ?? item.created_at).toLocaleString("en-UG")}</dd></div></dl>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">{item.message}</p>
            </button>
            {item.channel === "IN_APP" && <button type="button" onClick={() => void clear(item.id)} className="absolute right-2 top-2 grid size-7 place-items-center rounded-md text-sm text-slate-400 hover:bg-slate-200 hover:text-slate-700" aria-label="Dismiss notification">×</button>}
          </article>)}</div> : <div className="grid min-h-72 place-items-center text-center"><div><p className="font-semibold text-slate-700">No notifications recorded</p><p className="mt-1 text-sm text-slate-500">New alert deliveries will appear here automatically.</p></div></div>}
      </section>
      {preferences && <div className="space-y-4"><form onSubmit={(event) => void save(event)} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-black text-slate-950">Preferences</h2><p className="mt-1 text-xs text-slate-500">Choose how alerts reach you.</p>
        <div className="mt-5 space-y-3">{preferenceFields.map(([field, label]) => <label key={field} className="flex items-center justify-between gap-4 text-sm text-slate-700"><span>{label}</span><input type="checkbox" checked={preferences[field]} onChange={(event) => setPreferences({ ...preferences, [field]: event.target.checked })} className="size-4 accent-cyan-700" /></label>)}</div>
        <button type="submit" className="mt-5 w-full rounded-lg bg-cyan-700 px-4 py-2 text-sm font-bold text-white">Save preferences</button>
        <button type="button" disabled={testingEmail} onClick={() => void testEmail()} className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60">{testingEmail ? "Sending email..." : "Test email"}</button>
      </form>
        <aside className="rounded-lg border border-cyan-200 bg-cyan-50 p-4"><h2 className="text-sm font-bold text-cyan-950">SMS Delivery</h2><p className="mt-2 text-xs leading-5 text-cyan-900">SMS alerts are transmitted directly by the ESP32 through the installed SIM800 GSM module whenever a critical sewer event is detected.</p><p className="mt-2 text-xs leading-5 text-cyan-900">The dashboard manages notification preferences and records SMS notification history but does not send SMS messages directly.</p></aside>
      </div>}
    </div>
  </main></AppShell>;
}
