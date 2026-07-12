// Defines sensor reading routes and delegates HTTP handling to controllers.
import { Router } from "express";
import { getLiveReading } from "../controllers/readings.controller";

const router = Router();

router.get("/live", getLiveReading);

export default router;
