// Defines health-related API routes and delegates request handling to controllers.
import { Router } from "express";
import { healthCheck } from "../controllers/health.controller";

const router = Router();

router.get("/", healthCheck);

export default router;
