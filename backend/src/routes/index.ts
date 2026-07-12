// Centralizes all API route modules under the shared /api namespace.
import { Router } from "express";
import healthRoutes from "./health.routes";
import readingsRoutes from "./readings.routes";
import tankRoutes from "./tank.routes";

const router = Router();

router.use("/health", healthRoutes);
router.use("/readings", readingsRoutes);
router.use("/tanks", tankRoutes);

export default router;
