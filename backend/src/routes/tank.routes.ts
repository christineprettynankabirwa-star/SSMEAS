// Defines tank management routes and delegates HTTP handling to controllers.
import { Router } from "express";
import { destroyTank, getTank, getTanks, postTank, putTank } from "../controllers/tank.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/authorize.middleware";

const router = Router();

router.use(authenticate);
router.get("/", authorize("ADMINISTRATOR", "SUPERVISOR"), getTanks);
router.get("/:id", authorize("ADMINISTRATOR", "SUPERVISOR"), getTank);
router.post("/", authorize("ADMINISTRATOR"), postTank);
router.put("/:id", authorize("ADMINISTRATOR"), putTank);
router.delete("/:id", authorize("ADMINISTRATOR"), destroyTank);

export default router;
