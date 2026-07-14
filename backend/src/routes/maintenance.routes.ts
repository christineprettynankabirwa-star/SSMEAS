import { Router } from "express";
import { getMaintenance, postMaintenance } from "../controllers/maintenance.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/authorize.middleware";

const router = Router();
router.use(authenticate);
router.get("/", authorize("ADMINISTRATOR", "MAINTENANCE_OFFICER", "SUPERVISOR"), getMaintenance);
router.post("/", authorize("ADMINISTRATOR", "MAINTENANCE_OFFICER"), postMaintenance);
export default router;
