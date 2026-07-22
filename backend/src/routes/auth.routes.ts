import { Router } from "express";
import { getCurrentProfile, getOfficers, postLogin } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();
router.post("/login", postLogin);
router.get("/profile", authenticate, getCurrentProfile);
router.get("/maintenance-officers", authenticate, getOfficers);

export default router;
