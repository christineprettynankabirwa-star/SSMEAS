import { Router } from "express";
import { getOptimizedRoute } from "../controllers/route-optimization.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/authorize.middleware";

const router = Router();
router.get("/optimized", authenticate, authorize("ADMINISTRATOR", "MAINTENANCE_OFFICER", "SUPERVISOR"), getOptimizedRoute);
export default router;
