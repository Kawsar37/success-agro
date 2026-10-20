import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.js";
import { ApiError } from "../utils/apiError.js";

/**
 * Strict Sales Officer isolation middleware.
 * Ensures that Sales Officers are explicitly barred from sensitive modules
 * (accounts, inventory management, production, employee payroll, system settings, executive reports)
 */
export const blockSalesOfficerFromModule = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.user && (req.user.role === "SalesOfficer" || req.user.role === "DeliveryMan")) {
    return next(
      new ApiError(
        403,
        "Access Denied: Non-administrative roles are restricted from this module."
      )
    );
  }
  next();
};

/**
 * Applies Sales Officer data scoping to queries.
 * If user is a SalesOfficer, forces query filters to their assigned profile/orders.
 */
export const scopeSalesOfficerQuery = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.user && req.user.role === "SalesOfficer") {
    if (!req.user.salesOfficerProfile) {
      return next(
        new ApiError(403, "Sales Officer profile not linked to user account. Contact administrator.")
      );
    }
  }
  next();
};
