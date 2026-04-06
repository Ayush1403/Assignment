import jwt from "jsonwebtoken";
import { z } from "zod";
import User from "../models/User.js";
import ApiError from "../utils/apiError.js";

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// Zod schemas defined once and reused — keeps validation close to the controller
const registerSchema = z.object({
  name: z.string().min(2).max(60),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["viewer", "analyst", "admin"]).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * POST /auth/register
 * Creates a new user account. Role defaults to 'viewer' if not specified.
 * In a real system you'd restrict who can create admin accounts.
 */
export const register = async (req, res, next) => {
  try {
    const data = registerSchema.safeParse(req.body);
    if (!data.success) throw new ApiError(400, data.error.errors.map((e) => e.message).join("; "));

    const { name, email, password, role } = data.data;

    const existing = await User.findOne({ email });
    if (existing) throw new ApiError(409, "Email already in use");

    const user = await User.create({ name, email, password, role });
    const token = signToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /auth/login
 * Returns a JWT on valid credentials. Password field is explicitly selected
 * here because the model excludes it by default.
 */
export const login = async (req, res, next) => {
  try {
    const data = loginSchema.safeParse(req.body);
    if (!data.success) throw new ApiError(400, data.error.errors.map((e) => e.message).join("; "));

    const { email, password } = data.data;

    const user = await User.findOne({ email }).select("+password");
    if (!user) throw new ApiError(401, "Invalid email or password");
    if (user.status === "inactive") throw new ApiError(403, "Account is deactivated");

    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw new ApiError(401, "Invalid email or password");

    const token = signToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};
