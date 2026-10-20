import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User, IUser } from "../models/User.js";
import { ApiError } from "../utils/apiError.js";

export interface AuthRequest extends Request {
  user?: IUser;
}

export type AuthenticatedRequest = AuthRequest;

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      throw new ApiError(401, "Authentication token missing or invalid");
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string; role: string };
    const user = await User.findById(decoded.id).select("+password");

    if (!user || !user.isActive) {
      throw new ApiError(401, "User not found or account is deactivated");
    }

    req.user = user;
    next();
  } catch (error: any) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      next(new ApiError(401, "Session expired or invalid token. Please log in again."));
    } else {
      next(error);
    }
  }
};
