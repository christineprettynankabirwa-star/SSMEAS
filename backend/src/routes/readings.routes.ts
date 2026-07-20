// Defines sensor reading routes and delegates HTTP handling to controllers.
import { Router } from "express";
import { getLatestReadings, getLiveReading, getReadingAnalytics, getReadingHistory } from "../controllers/readings.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/authorize.middleware";

const router = Router();

router.use(authenticate, authorize("ADMINISTRATOR", "MAINTENANCE_OFFICER", "SUPERVISOR"));
router.get("/live", getLiveReading);
router.get("/latest", getLatestReadings);
router.get("/analytics", getReadingAnalytics);
router.get("/history/:tankId", getReadingHistory);

export default router;
