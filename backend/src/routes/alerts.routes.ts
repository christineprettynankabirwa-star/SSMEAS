import { Router } from "express";
import { getAlerts } from "../controllers/alerts.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/authorize.middleware";

const router = Router();
router.get("/", authenticate, authorize("ADMINISTRATOR", "SUPERVISOR"), getAlerts);
export default router;
