// Centralizes all API route modules under the shared /api namespace.
import { Router } from "express";
import alertsRoutes from "./alerts.routes";
import dashboardRoutes from "./dashboard.routes";
import healthRoutes from "./health.routes";
import maintenanceRoutes from "./maintenance.routes";
import readingsRoutes from "./readings.routes";
import tankRoutes from "./tank.routes";

const router = Router();

router.use("/health", healthRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/readings", readingsRoutes);
router.use("/tanks", tankRoutes);
router.use("/alerts", alertsRoutes);
router.use("/maintenance", maintenanceRoutes);

export default router;
