import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User, IUser } from "../models/User.js";
import { SalesOfficer } from "../models/SalesOfficer.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { AuthRequest } from "../middlewares/auth.js";
import { logAuditEvent } from "../utils/auditLogger.js";

const generateToken = (user: IUser): string => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
      salesOfficerProfile: user.salesOfficerProfile,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as any }
  );
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ApiError(400, "Please provide email and password");
    }

    const user = await User.findOne({ email: email.toLowerCase() })
      .select("+password")
      .populate("salesOfficerProfile");

    if (!user || !(await user.comparePassword(password))) {
      throw new ApiError(401, "Invalid email or password");
    }

    if (!user.isActive) {
      throw new ApiError(403, "Your account has been deactivated. Contact administration.");
    }

    const token = generateToken(user);

    // Set secure HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await logAuditEvent({
      userId: (user._id as any).toString(),
      userName: user.name,
      action: "LOGIN",
      module: "AUTH",
      ipAddress: req.ip,
    });

    const userObj = user.toObject();
    delete (userObj as any).password;

    res.status(200).json(
      ApiResponse.success(
        {
          token,
          user: userObj,
        },
        "Login successful"
      )
    );
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  res.clearCookie("token");
  res.status(200).json(ApiResponse.success(null, "Logged out successfully"));
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.user?._id)
      .populate({
        path: "salesOfficerProfile",
        populate: { path: "territory" },
      });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    res.status(200).json(ApiResponse.success(user));
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      throw new ApiError(400, "Please provide current and new password");
    }

    const user = await User.findById(req.user?._id).select("+password");
    if (!user || !(await user.comparePassword(currentPassword))) {
      throw new ApiError(400, "Incorrect current password");
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json(ApiResponse.success(null, "Password updated successfully"));
  } catch (error) {
    next(error);
  }
};
