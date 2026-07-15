import { Router } from "express";
import { getDashboardSummary } from "../controllers/dashboard.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/authorize.middleware";

const router = Router();
router.get("/summary", authenticate, authorize("ADMINISTRATOR", "SUPERVISOR"), getDashboardSummary);
export default router;
