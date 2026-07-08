import cors from "cors";
import express, { type Request, type Response } from "express";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_request: Request, response: Response) => {
  response.json({
    status: "ok",
    message: "SSMEAS Backend Running",
    service: "ssmeas-backend",
  });
});
