// Configures a reusable PostgreSQL connection pool for application services.
import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

export const pool = new Pool(
  databaseUrl
    ? {
        connectionString: databaseUrl,
      }
    : {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT ?? 5432),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      },
);

export default pool;
