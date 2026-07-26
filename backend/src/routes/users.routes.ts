import { Router } from "express";
import { deleteUser, getUsers, patchUserRole, postUser } from "../controllers/users.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorizePermission } from "../middleware/authorize.middleware";

const router = Router();
router.use(authenticate, authorizePermission("users:manage"));
router.get("/", getUsers);
router.post("/", postUser);
router.patch("/:id/role", patchUserRole);
router.delete("/:id", deleteUser);
export default router;
