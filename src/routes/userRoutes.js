import { Router } from "express";
import authenticate from "../middleware/authMiddleware.js";
import authorize from "../middleware/roleMiddleware.js";
import { getUsers, getUser, updateUser, deactivateUser } from "../controllers/userController.js";

const router = Router();

// All user management routes require authentication
router.use(authenticate);

// Admin-only: list all users
router.get("/", authorize("admin"), getUsers);

// Any authenticated user can fetch a profile (controller enforces own-profile restriction for non-admins)
router.get("/:id", getUser);

// Admin-only: update role and status
router.put("/:id", authorize("admin"), updateUser);

// Admin-only: soft-deactivate a user
router.delete("/:id", authorize("admin"), deactivateUser);

export default router;
