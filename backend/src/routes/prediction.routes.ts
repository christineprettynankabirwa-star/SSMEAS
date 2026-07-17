import { Router } from "express";
import { getOverflowPrediction } from "../controllers/prediction.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/authorize.middleware";

const router = Router();
router.get("/:tankId", authenticate, authorize("ADMINISTRATOR", "MAINTENANCE_OFFICER", "SUPERVISOR"), getOverflowPrediction);
export default router;
