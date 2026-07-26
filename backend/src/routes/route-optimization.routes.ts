import { Router } from "express";
import { getOptimizedRoute } from "../controllers/route-optimization.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorizePermission } from "../middleware/authorize.middleware";

const router = Router();
router.get("/optimized", authenticate, authorizePermission("routes:read"), getOptimizedRoute);
export default router;
