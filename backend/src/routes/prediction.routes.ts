import { Router } from "express";
import {
  getOverflowPrediction, getOverflowPredictions, getPredictionEvaluation, getPredictionHistory,
} from "../controllers/prediction.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorizePermission } from "../middleware/authorize.middleware";

const router = Router();
router.get("/", authenticate, authorizePermission("predictions:read"), getOverflowPredictions);
router.get("/history", authenticate, authorizePermission("predictions:read"), getPredictionHistory);
router.get("/evaluation", authenticate, authorizePermission("predictions:read"), getPredictionEvaluation);
router.get("/:tankId", authenticate, authorizePermission("predictions:read"), getOverflowPrediction);
export default router;
