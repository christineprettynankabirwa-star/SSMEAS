import type { AlertSeverity } from "./alerts.types";

export type NotificationChannel = "EMAIL" | "SMS" | "DASHBOARD";
export type NotificationStatus = "QUEUED" | "SENT" | "FAILED" | "READ";

export interface NotificationPreference {
  id: string;
  user_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  dashboard_enabled: boolean;
  critical_only: boolean;
  warning_enabled: boolean;
  daily_summary: boolean;
  created_at: Date;
  updated_at: Date;
}

export type NotificationPreferenceUpdate = Pick<NotificationPreference,
  "email_enabled" | "sms_enabled" | "dashboard_enabled" | "critical_only" |
  "warning_enabled" | "daily_summary">;

export interface Notification {
  id: string;
  alert_id: string;
  user_id: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  recipient: string;
  subject: string;
  message: string;
  sent_at: Date | null;
  read_at: Date | null;
  error_message: string | null;
  created_at: Date;
  tank_id: string;
  tank_name: string;
  severity: AlertSeverity;
  alert_type: string;
}

export interface NotificationRecipient {
  id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  role: "ADMINISTRATOR" | "MAINTENANCE_OFFICER" | "SUPERVISOR" | "CLIENT";
  preferences: NotificationPreference;
}

export interface ProviderMessage {
  notificationId: string;
  recipient: string;
  subject: string;
  message: string;
}

