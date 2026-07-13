import { Router } from "express";
import { getAlerts, postAlert } from "../controllers/alerts.controller";

const router = Router();
router.get("/", getAlerts);
router.post("/", postAlert);
export default router;
