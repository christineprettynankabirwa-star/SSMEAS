import axios from "axios";
import * as notificationModel from "../models/notifications.model";
import type { ProviderMessage } from "../types/notifications.types";

export interface NotificationService {
  send(message: ProviderMessage): Promise<void>;
}

abstract class HttpNotificationProvider implements NotificationService {
  constructor(private readonly endpoint: string | undefined, private readonly apiKey: string | undefined) {}
  protected abstract payload(message: ProviderMessage): object;
  async send(message: ProviderMessage): Promise<void> {
    if (!this.endpoint) {
      if (message.notificationId !== "test") {
        await notificationModel.markDelivery(message.notificationId, "FAILED", "Provider endpoint is not configured.");
      } else {
        throw new Error("Provider endpoint is not configured.");
      }
      return;
    }
    try {
      const config = this.apiKey
        ? { headers: { Authorization: `Bearer ${this.apiKey}` }, timeout: 10_000 }
        : { timeout: 10_000 };
      await axios.post(this.endpoint, this.payload(message), config);
      if (message.notificationId !== "test") await notificationModel.markDelivery(message.notificationId, "SENT");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Provider request failed.";
      if (message.notificationId !== "test") {
        await notificationModel.markDelivery(message.notificationId, "FAILED", detail.slice(0, 1_000));
      } else {
        throw error;
      }
    }
  }
}

export class DashboardNotificationProvider implements NotificationService {
  async send(message: ProviderMessage): Promise<void> {
    if (message.notificationId !== "test") await notificationModel.markDelivery(message.notificationId, "SENT");
  }
}

export class EmailNotificationProvider extends HttpNotificationProvider {
  constructor() { super(process.env.EMAIL_PROVIDER_URL, process.env.EMAIL_PROVIDER_API_KEY); }
  protected payload(value: ProviderMessage): object {
    return { to: value.recipient, subject: value.subject, text: value.message,
      from: process.env.EMAIL_FROM ?? "alerts@ssmeas.local" };
  }
}

export class SmsNotificationProvider extends HttpNotificationProvider {
  constructor() { super(process.env.SMS_PROVIDER_URL, process.env.SMS_PROVIDER_API_KEY); }
  protected payload(value: ProviderMessage): object {
    return { to: value.recipient, message: `${value.subject}\n${value.message}`,
      sender: process.env.SMS_SENDER_ID ?? "SSMEAS" };
  }
}
