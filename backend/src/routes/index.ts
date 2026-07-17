// Centralizes all API route modules under the shared /api namespace.
import { Router } from "express";
import alertsRoutes from "./alerts.routes";
import authRoutes from "./auth.routes";
import dashboardRoutes from "./dashboard.routes";
import deviceRoutes from "./device.routes";
import healthRoutes from "./health.routes";
import maintenanceRoutes from "./maintenance.routes";
import predictionRoutes from "./prediction.routes";
import readingsRoutes from "./readings.routes";
import routeOptimizationRoutes from "./route-optimization.routes";
import tankRoutes from "./tank.routes";

const router = Router();

router.use("/health", healthRoutes);
router.use(authRoutes);
router.use("/device", deviceRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/readings", readingsRoutes);
router.use("/tanks", tankRoutes);
router.use("/alerts", alertsRoutes);
router.use("/maintenance", maintenanceRoutes);
router.use("/predictions", predictionRoutes);
router.use("/routes", routeOptimizationRoutes);

export default router;
