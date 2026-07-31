import type { Alert } from "../types/alerts.types";
import type { SensorReading } from "../types/readings.types";
import { dispatchAlertNotifications } from "./notifications.service";

export interface AlertNotificationEvent {
  alert: Alert;
  reading?: SensorReading;
}

export type AlertNotificationListener = (event: AlertNotificationEvent) => Promise<void>;

export class NotificationEventBus {
  private readonly listeners = new Set<AlertNotificationListener>();

  subscribe(listener: AlertNotificationListener): (() => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async publish(event: AlertNotificationEvent): Promise<void> {
    const results = await Promise.allSettled([...this.listeners].map((listener) => listener(event)));
    results.forEach((result) => {
      if (result.status === "rejected") {
        console.error("Notification pipeline failed without interrupting alert creation:", result.reason);
      }
    });
  }
}

const notificationEventBus = new NotificationEventBus();
notificationEventBus.subscribe(async ({ alert, reading }) =>
  dispatchAlertNotifications(alert, reading));

export const subscribeToAlertNotifications = (listener: AlertNotificationListener): (() => void) =>
  notificationEventBus.subscribe(listener);

export const publishAlertNotificationEvent = (event: AlertNotificationEvent): Promise<void> =>
  notificationEventBus.publish(event);
