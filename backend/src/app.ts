// Creates and configures the Express application used by the SSMEAS API.
import cors from "cors";
import dotenv from "dotenv";
import express, { Request, Response } from "express";
import { pool } from "./config/database";
import { authenticate } from "./middleware/auth.middleware";
import { authorize } from "./middleware/authorize.middleware";
import apiRoutes from "./routes";

dotenv.config();

export const app = express();

app.use(cors());
app.use(express.json());

// Temporary debugging endpoint to confirm PostgreSQL connectivity.
app.get("/api/db-test", authenticate, authorize("ADMINISTRATOR"), async (_req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS current_time");
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Database connection test failed" });
  }
});

app.use("/api", apiRoutes);

export default app;
