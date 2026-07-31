import { Router } from "express";
import { getAlerts, patchAlertAcknowledgement, patchAlertResolution } from "../controllers/alerts.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorizePermission } from "../middleware/authorize.middleware";

const router = Router();
router.get("/", authenticate, authorizePermission("alerts:read"), getAlerts);
router.patch("/:id/acknowledge", authenticate, authorizePermission("alerts:acknowledge"), patchAlertAcknowledgement);
router.patch("/:id/resolve", authenticate, authorizePermission("alerts:acknowledge"), patchAlertResolution);
export default router;
