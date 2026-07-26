import { Router } from "express";
import { deleteMaintenance, getMaintenance, patchMaintenance, postMaintenance } from "../controllers/maintenance.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorizePermission } from "../middleware/authorize.middleware";

const router = Router();
router.use(authenticate);
router.get("/", authorizePermission("maintenance:read"), getMaintenance);
router.post("/", authorizePermission("maintenance:create"), postMaintenance);
router.patch("/:id", authorizePermission("maintenance:update"), patchMaintenance);
router.delete("/:id", authorizePermission("maintenance:delete"), deleteMaintenance);
export default router;
