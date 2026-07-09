// Creates and configures the Express application used by the SSMEAS API.
import cors from "cors";
import dotenv from "dotenv";
import express, { Request, Response } from "express";
import apiRoutes from "./routes";

dotenv.config();

export const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", apiRoutes);

export default app;
