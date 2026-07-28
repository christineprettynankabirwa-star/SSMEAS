export type UserRole = "ADMINISTRATOR" | "MAINTENANCE_OFFICER" | "SUPERVISOR" | "CLIENT";

export interface UserRecord {
  id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
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

export interface UpdateUserRequest {
  full_name: string;
  email: string;
  role: UserRole;
  password?: string;
}

export interface JwtUserPayload {
  sub: string;
  email: string;
  role: UserRole;
}
