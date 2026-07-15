import { pool } from "../config/database";
import { createUser } from "../services/auth.service";
import type { UserRole } from "../types/auth.types";

const [fullName, email, password, role] = process.argv.slice(2);

if (!fullName || !email || !password || !role) {
  console.error("Usage: npm run create-user -- \"Full Name\" email password ROLE");
  process.exitCode = 1;
} else {
  createUser({ full_name: fullName, email, password, role: role as UserRole })
    .then((user) => console.log(`Created ${user.role} user ${user.email}.`))
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : "Unable to create user.");
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
