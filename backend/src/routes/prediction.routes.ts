import { Router } from "express";
import { getOverflowPrediction, getOverflowPredictions } from "../controllers/prediction.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorizePermission } from "../middleware/authorize.middleware";

const router = Router();
router.get("/", authenticate, authorizePermission("predictions:read"), getOverflowPredictions);
router.get("/:tankId", authenticate, authorizePermission("predictions:read"), getOverflowPrediction);
export default router;
