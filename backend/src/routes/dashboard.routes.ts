import { Router } from "express";
import { getDashboardSummary } from "../controllers/dashboard.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorizePermission } from "../middleware/authorize.middleware";

const router = Router();
router.get("/summary", authenticate, authorizePermission("dashboard:read"), getDashboardSummary);
export default router;
