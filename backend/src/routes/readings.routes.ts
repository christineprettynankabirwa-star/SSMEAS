// Defines sensor reading routes and delegates HTTP handling to controllers.
import { Router } from "express";
import { getLiveReading, getReadingHistory } from "../controllers/readings.controller";

const router = Router();

router.get("/live", getLiveReading);
router.get("/history/:tankId", getReadingHistory);

export default router;
