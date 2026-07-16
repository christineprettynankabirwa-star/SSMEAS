import { Router } from "express";
import { createDeviceReading } from "../controllers/readings.controller";
import { authenticateDevice } from "../middleware/device-auth.middleware";

const router = Router();

router.post("/readings", authenticateDevice, createDeviceReading);

export default router;
