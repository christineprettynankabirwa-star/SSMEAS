import { Router } from "express";
import {
  deleteNotificationController, getNotifications, getPreferences, getUnreadNotificationCount,
  getUnreadNotifications,
  patchNotificationRead, patchNotificationsReadAll, postTestEmail, postTestSms, putPreferences,
} from "../controllers/notifications.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorizePermission } from "../middleware/authorize.middleware";

const router = Router();
router.use(authenticate);
router.get("/", authorizePermission("notifications:read"), getNotifications);
router.get("/unread", authorizePermission("notifications:read"), getUnreadNotifications);
router.get("/unread-count", authorizePermission("notifications:read"), getUnreadNotificationCount);
router.patch("/read-all", authorizePermission("notifications:read"), patchNotificationsReadAll);
router.patch("/:id/read", authorizePermission("notifications:read"), patchNotificationRead);
router.get("/preferences", authorizePermission("notifications:configure"), getPreferences);
router.put("/preferences", authorizePermission("notifications:configure"), putPreferences);
router.post("/test-email", authorizePermission("notifications:configure"), postTestEmail);
router.post("/test-sms", authorizePermission("notifications:configure"), postTestSms);
router.delete("/:id", authorizePermission("notifications:configure"), deleteNotificationController);
export default router;
