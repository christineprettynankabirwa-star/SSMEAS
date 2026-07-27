import { Router } from "express";
import {
  postAllTestTankReset, postSimulationReading, postTankReset,
} from "../controllers/simulation.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorizePermission } from "../middleware/authorize.middleware";

const router = Router();
router.use(authenticate, authorizePermission("simulation:manage"));
router.post("/tanks/:tankId/readings", postSimulationReading);
router.post("/tanks/:tankId/reset", postTankReset);
router.post("/reset-all", postAllTestTankReset);
export default router;
