import type { Request, Response } from "express";
import {
  getNotificationPreferences, listNotifications, listUnreadNotifications,
  NotificationNotFoundError, NotificationValidationError, readAllNotifications,
  readNotification, sendTestNotification, setNotificationPreferences,
} from "../services/notifications.service";

const user = (request: Request) => request.user!;
const handle = (error: unknown, response: Response): void => {
  if (error instanceof NotificationValidationError) {
    response.status(400).json({ message: error.message }); return;
  }
  if (error instanceof NotificationNotFoundError) {
    response.status(404).json({ message: error.message }); return;
  }
  console.error("Notification request failed:", error);
  response.status(500).json({ message: "Unable to process notification request." });
};

export const getNotifications = async (request: Request, response: Response): Promise<void> => {
  try { response.json(await listNotifications(user(request).id)); } catch (error) { handle(error, response); }
};
export const getUnreadNotifications = async (request: Request, response: Response): Promise<void> => {
  try { response.json(await listUnreadNotifications(user(request).id)); } catch (error) { handle(error, response); }
};
export const patchNotificationRead = async (request: Request, response: Response): Promise<void> => {
  try { response.json(await readNotification(String(request.params.id), user(request).id)); }
  catch (error) { handle(error, response); }
};
export const patchNotificationsReadAll = async (request: Request, response: Response): Promise<void> => {
  try { response.json({ updated: await readAllNotifications(user(request).id) }); }
  catch (error) { handle(error, response); }
};
export const getPreferences = async (request: Request, response: Response): Promise<void> => {
  try { response.json(await getNotificationPreferences(user(request).id)); }
  catch (error) { handle(error, response); }
};
export const putPreferences = async (request: Request, response: Response): Promise<void> => {
  try { response.json(await setNotificationPreferences(user(request).id, request.body)); }
  catch (error) { handle(error, response); }
};
export const postTestEmail = async (request: Request, response: Response): Promise<void> => {
  try { response.json(await sendTestNotification("EMAIL", user(request))); }
  catch (error) { handle(error, response); }
};
export const postTestSms = async (request: Request, response: Response): Promise<void> => {
  try { response.json(await sendTestNotification("SMS", user(request))); }
  catch (error) { handle(error, response); }
};

