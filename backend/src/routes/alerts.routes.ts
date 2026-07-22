import { Router } from "express";
import { getAlerts, patchAlertAcknowledgement } from "../controllers/alerts.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/authorize.middleware";

const router = Router();
router.get("/", authenticate, authorize("ADMINISTRATOR", "SUPERVISOR"), getAlerts);
router.patch("/:id/acknowledge", authenticate, authorize("ADMINISTRATOR", "SUPERVISOR"), patchAlertAcknowledgement);
export default router;
