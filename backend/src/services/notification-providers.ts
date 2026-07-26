import nodemailer, { type Transporter } from "nodemailer";
import * as notificationModel from "../models/notifications.model";
import type { ProviderMessage } from "../types/notifications.types";

export interface NotificationProvider {
  send(message: ProviderMessage): Promise<void>;
}

export interface SmsProvider {
  sendSMS(phoneNumber: string, message: string): Promise<void>;
}

export class MockSmsProvider implements SmsProvider {
  async sendSMS(phoneNumber: string, message: string): Promise<void> {
    console.info("Mock SMS prepared", { phoneNumber, message, timestamp: new Date().toISOString() });
  }
}

const deliveryLog = (
  message: ProviderMessage,
  channel: "EMAIL" | "SMS" | "IN_APP",
  status: "SENT" | "FAILED",
  error?: string,
): void => {
  console.info("Notification delivery", {
    recipient: message.recipient,
    tank: message.tankName ?? message.tankId ?? "not-applicable",
    channel,
    status,
    timestamp: new Date().toISOString(),
    ...(error ? { error } : {}),
  });
};

abstract class TrackedProvider implements NotificationProvider {
  protected abstract readonly channel: "EMAIL" | "SMS" | "IN_APP";
  protected abstract deliver(message: ProviderMessage): Promise<void>;

  async send(message: ProviderMessage): Promise<void> {
    try {
      await this.deliver(message);
      if (message.notificationId !== "test") {
        await notificationModel.markDelivery(message.notificationId, "SENT");
      }
      deliveryLog(message, this.channel, "SENT");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Provider delivery failed.";
      if (message.notificationId !== "test") {
        await notificationModel.markDelivery(message.notificationId, "FAILED", detail.slice(0, 1_000));
        deliveryLog(message, this.channel, "FAILED", detail);
        return;
      }
      throw error;
    }
  }
}

export class InAppNotificationProvider extends TrackedProvider {
  protected readonly channel = "IN_APP" as const;
  protected async deliver(): Promise<void> {}
}

export class NodemailerEmailProvider extends TrackedProvider {
  protected readonly channel = "EMAIL" as const;
  private readonly transporter: Transporter;

  constructor(transporter?: Transporter) {
    super();
    this.transporter = transporter ?? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    });
  }

  protected async deliver(message: ProviderMessage): Promise<void> {
    if (!process.env.SMTP_HOST) throw new Error("SMTP_HOST is not configured.");
    await this.transporter.sendMail({
      from: process.env.EMAIL_FROM ?? "alerts@ssmeas.local",
      to: message.recipient,
      subject: message.subject,
      text: message.message,
    });
  }
}

export class SmsNotificationProvider extends TrackedProvider {
  protected readonly channel = "SMS" as const;
  constructor(private readonly provider: SmsProvider = new MockSmsProvider()) { super(); }
  protected async deliver(message: ProviderMessage): Promise<void> {
    await this.provider.sendSMS(
      message.recipient,
      message.smsMessage ?? `${message.subject}\n${message.message}`,
    );
  }
}
