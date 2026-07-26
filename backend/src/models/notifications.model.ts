import type { PoolClient } from "pg";
import { pool } from "../config/database";
import type { Alert } from "../types/alerts.types";
import type {
  Notification, NotificationChannel, NotificationPreference,
  NotificationPreferenceUpdate, NotificationRecipient,
} from "../types/notifications.types";

const notificationColumns = `notification.id, notification.alert_id, notification.user_id,
  notification.channel, notification.status, notification.recipient, notification.subject,
  notification.message, notification.sent_at, notification.read_at, notification.error_message,
  notification.created_at, alert.tank_id, tank.tank_name, alert.severity, alert.alert_type`;

export const getRecipients = async (
  client: PoolClient,
  alert: Alert,
): Promise<NotificationRecipient[]> => {
  const result = await client.query<NotificationRecipient & NotificationPreference>(
    `SELECT user_account.id, user_account.full_name, user_account.email,
       user_account.phone_number, user_account.role,
       preference.id AS preference_id, preference.user_id,
       COALESCE(preference.email_enabled, TRUE) AS email_enabled,
       COALESCE(preference.sms_enabled, FALSE) AS sms_enabled,
       COALESCE(preference.dashboard_enabled, TRUE) AS dashboard_enabled,
       COALESCE(preference.critical_only, FALSE) AS critical_only,
       COALESCE(preference.warning_enabled, TRUE) AS warning_enabled,
       COALESCE(preference.daily_summary, FALSE) AS daily_summary,
       COALESCE(preference.created_at, user_account.created_at) AS created_at,
       COALESCE(preference.updated_at, user_account.updated_at) AS updated_at
     FROM users user_account
     LEFT JOIN notification_preferences preference ON preference.user_id = user_account.id
     WHERE user_account.role = 'ADMINISTRATOR'
        OR (user_account.role = 'SUPERVISOR' AND $2 IN ('warning', 'critical'))
        OR (user_account.role = 'CLIENT' AND EXISTS (
          SELECT 1 FROM tanks WHERE id = $1 AND owner_user_id = user_account.id
        ))
        OR (user_account.role = 'MAINTENANCE_OFFICER' AND EXISTS (
          SELECT 1 FROM maintenance
          WHERE tank_id = $1 AND assigned_to = user_account.id
            AND status IN ('SCHEDULED', 'ASSIGNED', 'IN_PROGRESS')
        ))`,
    [alert.tank_id, alert.severity],
  );
  return result.rows.map((row) => ({
    id: row.id, full_name: row.full_name, email: row.email,
    phone_number: row.phone_number, role: row.role,
    preferences: {
      id: (row as unknown as { preference_id: string }).preference_id,
      user_id: row.id,
      email_enabled: row.email_enabled, sms_enabled: row.sms_enabled,
      dashboard_enabled: row.dashboard_enabled, critical_only: row.critical_only,
      warning_enabled: row.warning_enabled, daily_summary: row.daily_summary,
      created_at: row.created_at, updated_at: row.updated_at,
    },
  }));
};

export const createNotification = async (
  client: PoolClient, alertId: string, userId: string, channel: NotificationChannel,
  recipient: string, subject: string, message: string,
): Promise<string | null> => {
  const result = await client.query<{ id: string }>(
    `INSERT INTO notifications(alert_id, user_id, channel, recipient, subject, message)
     VALUES($1, $2, $3, $4, $5, $6)
     ON CONFLICT(alert_id, user_id, channel) DO NOTHING RETURNING id`,
    [alertId, userId, channel, recipient, subject, message],
  );
  return result.rows[0]?.id ?? null;
};

export const markDelivery = async (
  id: string, status: "SENT" | "FAILED", errorMessage?: string,
): Promise<void> => {
  await pool.query(
    `UPDATE notifications SET status=$2, sent_at=CASE WHEN $2='SENT' THEN NOW() ELSE sent_at END,
       error_message=$3 WHERE id=$1`,
    [id, status, errorMessage ?? null],
  );
};

export const listForUser = async (userId: string, limit = 100): Promise<Notification[]> =>
  (await pool.query<Notification>(
    `SELECT ${notificationColumns} FROM notifications notification
     JOIN alerts alert ON alert.id=notification.alert_id JOIN tanks tank ON tank.id=alert.tank_id
     WHERE notification.user_id=$1 AND notification.channel='DASHBOARD'
     ORDER BY notification.created_at DESC LIMIT $2`,
    [userId, limit],
  )).rows;

export const unreadForUser = async (userId: string): Promise<Notification[]> =>
  (await pool.query<Notification>(
    `SELECT ${notificationColumns} FROM notifications notification
     JOIN alerts alert ON alert.id=notification.alert_id JOIN tanks tank ON tank.id=alert.tank_id
     WHERE notification.user_id=$1 AND notification.channel='DASHBOARD' AND notification.read_at IS NULL
     ORDER BY notification.created_at DESC`,
    [userId],
  )).rows;

export const markRead = async (id: string, userId: string): Promise<Notification | null> => {
  const result = await pool.query<Notification>(
    `WITH changed AS (
       UPDATE notifications SET status='READ', read_at=COALESCE(read_at, NOW())
       WHERE id=$1 AND user_id=$2 AND channel='DASHBOARD' RETURNING *
     ) SELECT ${notificationColumns} FROM changed notification
       JOIN alerts alert ON alert.id=notification.alert_id JOIN tanks tank ON tank.id=alert.tank_id`,
    [id, userId],
  );
  return result.rows[0] ?? null;
};

export const remove = async (id: string, userId: string): Promise<boolean> => {
  const result = await pool.query(
    "DELETE FROM notifications WHERE id=$1 AND user_id=$2 AND channel='DASHBOARD'",
    [id, userId],
  );
  return (result.rowCount ?? 0) > 0;
};

export const markAllRead = async (userId: string): Promise<number> =>
  (await pool.query(
    `UPDATE notifications SET status='READ', read_at=COALESCE(read_at, NOW())
     WHERE user_id=$1 AND channel='DASHBOARD' AND read_at IS NULL`,
    [userId],
  )).rowCount ?? 0;

export const getPreferences = async (userId: string): Promise<NotificationPreference> => {
  const result = await pool.query<NotificationPreference>(
    `INSERT INTO notification_preferences(user_id) VALUES($1)
     ON CONFLICT(user_id) DO UPDATE SET user_id=EXCLUDED.user_id RETURNING *`, [userId],
  );
  return result.rows[0]!;
};

export const updatePreferences = async (
  userId: string, value: NotificationPreferenceUpdate,
): Promise<NotificationPreference> => {
  const result = await pool.query<NotificationPreference>(
    `INSERT INTO notification_preferences(
       user_id,email_enabled,sms_enabled,dashboard_enabled,critical_only,warning_enabled,daily_summary
     ) VALUES($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT(user_id) DO UPDATE SET email_enabled=EXCLUDED.email_enabled,
       sms_enabled=EXCLUDED.sms_enabled,dashboard_enabled=EXCLUDED.dashboard_enabled,
       critical_only=EXCLUDED.critical_only,warning_enabled=EXCLUDED.warning_enabled,
       daily_summary=EXCLUDED.daily_summary,updated_at=NOW() RETURNING *`,
    [userId, value.email_enabled, value.sms_enabled, value.dashboard_enabled,
      value.critical_only, value.warning_enabled, value.daily_summary],
  );
  return result.rows[0]!;
};

