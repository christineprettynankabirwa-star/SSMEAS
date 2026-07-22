import { pool } from "../config/database";
import type { UserRecord, UserRole } from "../types/auth.types";

export const createUser = async (
  fullName: string,
  email: string,
  passwordHash: string,
  role: UserRole,
): Promise<UserRecord> => {
  const result = await pool.query<UserRecord>(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES ($1, LOWER($2), $3, $4)
     RETURNING id, full_name, email, password_hash, role, created_at, updated_at`,
    [fullName, email, passwordHash, role],
  );
  const user = result.rows[0];
  if (!user) throw new Error("User could not be created.");
  return user;
};

export const getUserByEmail = async (email: string): Promise<UserRecord | null> => {
  const result = await pool.query<UserRecord>(
    `SELECT id, full_name, email, password_hash, role, created_at, updated_at
     FROM users
     WHERE LOWER(email) = LOWER($1)
     LIMIT 1`,
    [email],
  );
  return result.rows[0] ?? null;
};

export const getUserById = async (id: string): Promise<UserRecord | null> => {
  const result = await pool.query<UserRecord>(
    `SELECT id, full_name, email, password_hash, role, created_at, updated_at
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [id],
  );
  return result.rows[0] ?? null;
};

export const getMaintenanceOfficers = async (): Promise<Array<Pick<UserRecord, "id" | "full_name" | "email" | "role">>> => {
  const result = await pool.query<Pick<UserRecord, "id" | "full_name" | "email" | "role">>(
    `SELECT id, full_name, email, role FROM users WHERE role = 'MAINTENANCE_OFFICER' ORDER BY full_name`,
  );
  return result.rows;
};
