import ApiError from "../utils/apiError.js";

/**
 * Role hierarchy: admin > analyst > viewer
 *
 * authorize(...roles) returns a middleware that checks whether
 * the authenticated user's role is in the allowed list.
 *
 * Usage:
 *   router.delete("/:id", authenticate, authorize("admin"), deleteRecord);
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) return next(new ApiError(401, "Not authenticated"));

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ApiError(403, `Role '${req.user.role}' is not permitted to perform this action`)
      );
    }

    next();
  };
};

export default authorize;
