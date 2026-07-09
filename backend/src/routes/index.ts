// Centralizes all API route modules under the shared /api namespace.
import { Router } from "express";
import healthRoutes from "./health.routes";

const router = Router();

router.use("/health", healthRoutes);

export default router;
