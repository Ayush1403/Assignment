import jwt from "jsonwebtoken";
import User from "../models/User.js";
import ApiError from "../utils/apiError.js";

/**
 * Verifies the JWT from the Authorization header.
 * Attaches the full user document to req.user on success.
 *
 * We re-fetch the user on every request rather than trusting the token
 * payload alone — this ensures deactivated accounts are rejected immediately
 * without waiting for the token to expire.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new ApiError(401, "No token provided");
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) throw new ApiError(401, "User no longer exists");
    if (user.status === "inactive") throw new ApiError(403, "Account is deactivated");

    req.user = user;
    next();
  } catch (err) {
    // Surface JWT-specific errors as 401s, not 500s
    if (err.name === "JsonWebTokenError") return next(new ApiError(401, "Invalid token"));
    if (err.name === "TokenExpiredError") return next(new ApiError(401, "Token expired"));
    next(err);
  }
};

export default authenticate;
