// Defines tank management routes and delegates HTTP handling to controllers.
import { Router } from "express";
import { destroyTank, getTank, getTanks, postTank, putTank } from "../controllers/tank.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorizePermission } from "../middleware/authorize.middleware";

const router = Router();

router.use(authenticate);
router.get("/", authorizePermission("tanks:read"), getTanks);
router.get("/:id", authorizePermission("tanks:read"), getTank);
router.post("/", authorizePermission("tanks:write"), postTank);
router.put("/:id", authorizePermission("tanks:write"), putTank);
router.delete("/:id", authorizePermission("tanks:delete"), destroyTank);

export default router;
