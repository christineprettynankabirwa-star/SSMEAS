import { pool } from "../config/database";
import * as notificationModel from "../models/notifications.model";
import type { Alert } from "../types/alerts.types";
import type { SensorReading } from "../types/readings.types";
import type {
  Notification, NotificationChannel, NotificationPreference,
  NotificationPreferenceUpdate, ProviderMessage,
} from "../types/notifications.types";
import {
  DashboardNotificationProvider, EmailNotificationProvider,
  NotificationService, SmsNotificationProvider,
} from "./notification-providers";

export class NotificationValidationError extends Error {}
export class NotificationNotFoundError extends Error {}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const providers: Record<NotificationChannel, NotificationService> = {
  DASHBOARD: new DashboardNotificationProvider(),
  EMAIL: new EmailNotificationProvider(),
  SMS: new SmsNotificationProvider(),
};

const recommendedAction = (alert: Alert): string =>
  alert.severity === "critical"
    ? "Immediate inspection and emptying are required."
    : alert.severity === "warning"
      ? "Plan inspection and emptying before conditions become critical."
      : "Continue monitoring.";

const isEligible = (severity: Alert["severity"], preference: NotificationPreference): boolean => {
  if (preference.critical_only) return severity === "critical";
  if (severity === "warning") return preference.warning_enabled;
  return true;
};

export const dispatchAlertNotifications = async (
  alert: Alert, reading?: SensorReading,
): Promise<void> => {
  const client = await pool.connect();
  const deliveries: Array<{ channel: NotificationChannel; value: ProviderMessage }> = [];
  try {
    await client.query("BEGIN");
    const recipients = await notificationModel.getRecipients(client, alert);
    const subject = `${alert.severity.toUpperCase()} ALERT — ${alert.tank_name}`;
    const message = [
      alert.message,
      `Tank: ${alert.tank_name}`,
      `Current level: ${reading?.level ?? "Unavailable"}${reading?.level === null || reading?.level === undefined ? "" : "%"}`,
      `Gas level: ${reading?.gas_level ?? "Unavailable"}`,
      `Location: ${alert.location}`,
      `Time: ${(reading?.recorded_at ?? new Date()).toISOString()}`,
      `Recommended action: ${recommendedAction(alert)}`,
    ].join("\n");

    for (const recipient of recipients) {
      if (!isEligible(alert.severity, recipient.preferences)) continue;
      const enabled: Array<[NotificationChannel, boolean, string | null]> = [
        ["DASHBOARD", recipient.preferences.dashboard_enabled, recipient.id],
        ["EMAIL", recipient.preferences.email_enabled, recipient.email],
        ["SMS", recipient.preferences.sms_enabled, recipient.phone_number],
      ];
      for (const [channel, isEnabled, address] of enabled) {
        if (!isEnabled || !address) continue;
        const notificationId = await notificationModel.createNotification(
          client, alert.id, recipient.id, channel, address, subject, message,
        );
        if (notificationId) {
          deliveries.push({
            channel,
            value: { notificationId, recipient: address, subject, message },
          });
        }
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  await Promise.allSettled(deliveries.map(({ channel, value }) => providers[channel].send(value)));
};

export const listNotifications = (userId: string): Promise<Notification[]> =>
  notificationModel.listForUser(userId);
export const listUnreadNotifications = (userId: string): Promise<Notification[]> =>
  notificationModel.unreadForUser(userId);

export const readNotification = async (id: string, userId: string): Promise<Notification> => {
  if (!uuidPattern.test(id)) throw new NotificationValidationError("Invalid notification id.");
  const notification = await notificationModel.markRead(id, userId);
  if (!notification) throw new NotificationNotFoundError("Notification not found.");
  return notification;
};

export const readAllNotifications = (userId: string): Promise<number> =>
  notificationModel.markAllRead(userId);

export const deleteNotification = async (id: string, userId: string): Promise<void> => {
  if (!uuidPattern.test(id)) throw new NotificationValidationError("Invalid notification id.");
  const deleted = await notificationModel.remove(id, userId);
  if (!deleted) throw new NotificationNotFoundError("Notification not found.");
};

export const getNotificationPreferences = (userId: string): Promise<NotificationPreference> =>
  notificationModel.getPreferences(userId);

export const setNotificationPreferences = (
  userId: string, input: unknown,
): Promise<NotificationPreference> => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new NotificationValidationError("Preferences must be a JSON object.");
  }
  const fields: Array<keyof NotificationPreferenceUpdate> = [
    "email_enabled", "sms_enabled", "dashboard_enabled",
    "critical_only", "warning_enabled", "daily_summary",
  ];
  const record = input as Record<string, unknown>;
  if (fields.some((field) => typeof record[field] !== "boolean")) {
    throw new NotificationValidationError("Every notification preference must be boolean.");
  }
  return notificationModel.updatePreferences(userId, record as unknown as NotificationPreferenceUpdate);
};

export const sendTestNotification = async (
  channel: "EMAIL" | "SMS", user: { id: string; email: string },
): Promise<{ message: string }> => {
  const client = await pool.connect();
  try {
    const preference = await notificationModel.getPreferences(user.id);
    const target = channel === "EMAIL" ? user.email
      : (await client.query<{ phone_number: string | null }>(
        "SELECT phone_number FROM users WHERE id=$1", [user.id],
      )).rows[0]?.phone_number;
    if (!target) throw new NotificationValidationError(
      channel === "SMS" ? "Add a phone number before testing SMS." : "Email address is unavailable.",
    );
    if (channel === "EMAIL" && !preference.email_enabled) {
      throw new NotificationValidationError("Email notifications are disabled in your preferences.");
    }
    if (channel === "SMS" && !preference.sms_enabled) {
      throw new NotificationValidationError("SMS notifications are disabled in your preferences.");
    }
    const provider = providers[channel];
    await provider.send({
      notificationId: "test",
      recipient: target,
      subject: "SSMEAS notification test",
      message: `Your ${channel.toLowerCase()} notification settings are working.`,
    });
    return { message: `${channel} test submitted.` };
  } finally {
    client.release();
  }
};
