import { Router } from "express";
import {
  getNotifications, getPreferences, getUnreadNotifications, patchNotificationRead,
  patchNotificationsReadAll, postTestEmail, postTestSms, putPreferences,
} from "../controllers/notifications.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();
router.use(authenticate);
router.get("/", getNotifications);
router.get("/unread", getUnreadNotifications);
router.patch("/read-all", patchNotificationsReadAll);
router.patch("/:id/read", patchNotificationRead);
router.get("/preferences", getPreferences);
router.put("/preferences", putPreferences);
router.post("/test-email", postTestEmail);
router.post("/test-sms", postTestSms);
export default router;

