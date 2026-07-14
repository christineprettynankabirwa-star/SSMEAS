export type UserRole = "ADMINISTRATOR" | "MAINTENANCE_OFFICER" | "SUPERVISOR";

export interface UserRecord {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

export type AuthenticatedUser = Omit<UserRecord, "password_hash">;

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreateUserRequest {
  full_name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface JwtUserPayload {
  sub: string;
  email: string;
  role: UserRole;
}
