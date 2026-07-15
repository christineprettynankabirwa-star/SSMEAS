import { Router } from "express";
import { getCurrentProfile, postLogin } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();
router.post("/login", postLogin);
router.get("/profile", authenticate, getCurrentProfile);

export default router;
