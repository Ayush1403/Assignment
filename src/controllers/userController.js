import { z } from "zod";
import User from "../models/User.js";
import ApiError from "../utils/apiError.js";

const updateUserSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  role: z.enum(["viewer", "analyst", "admin"]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

/**
 * GET /users
 * Admin only. Supports pagination via ?page and ?limit.
 */
export const getUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find().skip(skip).limit(limit).select("-__v"),
      User.countDocuments(),
    ]);

    res.json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: users,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /users/:id
 * Admin can view any user. Other roles can only view themselves.
 */
export const getUser = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === "admin";
    const targetId = req.params.id;

    // Non-admins can only fetch their own profile
    if (!isAdmin && targetId !== req.user._id.toString()) {
      throw new ApiError(403, "You can only view your own profile");
    }

    const user = await User.findById(targetId).select("-__v");
    if (!user) throw new ApiError(404, "User not found");

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /users/:id
 * Admin only. Updates role and status. Password changes handled separately.
 */
export const updateUser = async (req, res, next) => {
  try {
    const data = updateUserSchema.safeParse(req.body);
    if (!data.success) throw new ApiError(400, data.error.errors.map((e) => e.message).join("; "));

    const user = await User.findByIdAndUpdate(req.params.id, data.data, {
      new: true,
      runValidators: true,
    }).select("-__v");

    if (!user) throw new ApiError(404, "User not found");

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /users/:id
 * Admin only. Soft-deactivates a user rather than hard deleting
 * to preserve record ownership history.
 */
export const deactivateUser = async (req, res, next) => {
  try {
    // Prevent admins from accidentally locking themselves out
    if (req.params.id === req.user._id.toString()) {
      throw new ApiError(400, "You cannot deactivate your own account");
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: "inactive" },
      { new: true }
    );

    if (!user) throw new ApiError(404, "User not found");

    res.json({ success: true, message: "User deactivated", data: { id: user._id } });
  } catch (err) {
    next(err);
  }
};
