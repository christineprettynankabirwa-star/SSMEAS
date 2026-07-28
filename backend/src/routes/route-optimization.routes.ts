import { Router } from "express";
import { getOptimizedRoute, postOptimizedRoute } from "../controllers/route-optimization.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorizePermission } from "../middleware/authorize.middleware";

const router = Router();
router.get("/optimized", authenticate, authorizePermission("routes:read"), getOptimizedRoute);
router.post("/optimized", authenticate, authorizePermission("routes:read"), postOptimizedRoute);
export default router;
