// Starts the SSMEAS HTTP server after loading environment configuration.
import dotenv from "dotenv";
import type { Server } from "node:http";
import { app } from "./app";

dotenv.config();

const configuredPort = Number(process.env.PORT ?? 4000);
if (!Number.isInteger(configuredPort) || configuredPort < 1 || configuredPort > 65_535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}

const server: Server = app.listen(configuredPort, () => {
  console.log(`SSMEAS backend listening on port ${configuredPort}`);
});

server.on("error", (error) => {
  console.error("SSMEAS backend failed to start:", error);
  process.exitCode = 1;
});

const stopServer = (signal: NodeJS.Signals): void => {
  console.log(`Received ${signal}; shutting down SSMEAS backend.`);
  server.close((error) => {
    if (error) {
      console.error("SSMEAS backend shutdown failed:", error);
      process.exitCode = 1;
    }
  });
};

process.once("SIGINT", () => stopServer("SIGINT"));
process.once("SIGTERM", () => stopServer("SIGTERM"));
