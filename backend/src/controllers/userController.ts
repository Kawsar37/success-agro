import { Response, NextFunction } from "express";
import { AuthRequest } from "../middlewares/auth.js";
import { User } from "../models/User.js";
import { SalesOfficer } from "../models/SalesOfficer.js";
import { Territory } from "../models/Territory.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { generateSimpleId } from "../utils/idGenerator.js";
import { logAuditEvent } from "../utils/auditLogger.js";

export const getUsers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filter: any = {};
    if (req.query.role) filter.role = req.query.role;

    const users = await User.find(filter)
      .populate("salesOfficerProfile")
      .select("-password")
      .sort({ createdAt: -1 });
    res.status(200).json(ApiResponse.success(users));
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, phone, password, role, territoryId, vehicleNumber, assignedArea } = req.body;

    if (!name || !email || !phone || !password || !role) {
      throw new ApiError(400, "Please fill in all required fields (name, email, phone, password, role)");
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) throw new ApiError(400, "User with this email already exists");

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone,
      password,
      role,
      vehicleNumber,
      assignedArea,
    });

    // If adding a Sales Officer, auto-provision and link SalesOfficer profile
    if (role === "SalesOfficer") {
      let territory = territoryId;
      if (!territory) {
        const defaultTerr = await Territory.findOne();
        territory = defaultTerr?._id;
      }

      const officerCode = await generateSimpleId("SO", "sales_officer");
      const soProfile = await SalesOfficer.create({
        user: user._id,
        officerCode,
        name: user.name,
        phone: user.phone,
        email: user.email,
        territory,
        targetMonthlyAmount: 500000,
        commissionRate: 2.5,
        isActive: true,
      });

      user.salesOfficerProfile = soProfile._id;
      await user.save();
    }

    await logAuditEvent({
      userId: (req.user?._id as any)?.toString(),
      userName: req.user?.name,
      action: `CREATE_${role.toUpperCase()}`,
      module: "USER_MANAGEMENT",
      targetId: user.email,
      details: { role, name, phone },
      ipAddress: req.ip,
    });

    const userObj = user.toObject();
    delete (userObj as any).password;
    res.status(201).json(ApiResponse.success(userObj, `${role} created successfully`));
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) throw new ApiError(404, "User not found");

    if (user.role === "Admin" && (await User.countDocuments({ role: "Admin" })) <= 1) {
      throw new ApiError(400, "Cannot delete the only remaining Admin account");
    }

    if (user.salesOfficerProfile) {
      await SalesOfficer.findByIdAndDelete(user.salesOfficerProfile);
    }

    await User.findByIdAndDelete(id);

    res.status(200).json(ApiResponse.success(null, "User removed successfully"));
  } catch (error) {
    next(error);
  }
};
