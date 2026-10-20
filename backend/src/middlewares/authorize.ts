import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.js";
import { ApiError } from "../utils/apiError.js";
import { UserRole } from "../models/User.js";

export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new ApiError(401, "User unauthenticated"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ApiError(
          403,
          `Access forbidden: Role '${req.user.role}' is not authorized to access this resource`
        )
      );
    }

    next();
  };
};
