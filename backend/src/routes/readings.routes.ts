// Defines sensor reading routes and delegates HTTP handling to controllers.
import { Router } from "express";
import { getLatestReadings, getLiveReading, getReadingAnalytics, getReadingHistory } from "../controllers/readings.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorizePermission } from "../middleware/authorize.middleware";

const router = Router();

router.use(authenticate);
router.get("/live", authorizePermission("readings:live"), getLiveReading);
router.get("/latest", authorizePermission("readings:live"), getLatestReadings);
router.get("/analytics", authorizePermission("readings:analytics"), getReadingAnalytics);
router.get("/history/:tankId", authorizePermission("readings:history"), getReadingHistory);

export default router;
