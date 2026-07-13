import { Router } from "express";
import { getMaintenance, postMaintenance } from "../controllers/maintenance.controller";

const router = Router();
router.get("/", getMaintenance);
router.post("/", postMaintenance);
export default router;
