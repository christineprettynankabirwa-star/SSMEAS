// Defines tank management routes and delegates HTTP handling to controllers.
import { Router } from "express";
import { destroyTank, getTank, getTanks, postTank, putTank } from "../controllers/tank.controller";

const router = Router();

router.get("/", getTanks);
router.get("/:id", getTank);
router.post("/", postTank);
router.put("/:id", putTank);
router.delete("/:id", destroyTank);

export default router;
