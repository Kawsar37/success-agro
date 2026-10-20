import { Response, NextFunction } from "express";
import { AuthRequest } from "../middlewares/auth.js";
import { SystemSettings, AuditLog } from "../models/AuditAndSettings.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { recordAuditLog } from "../utils/auditLogger.js";

export const getSystemSettings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let settings = await SystemSettings.findOne();
    if (!settings) {
      settings = await SystemSettings.create({});
    }
    res.status(200).json(ApiResponse.success(settings));
  } catch (error) {
    next(error);
  }
};

export const updateSystemSettings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let settings = await SystemSettings.findOne();
    if (!settings) {
      settings = new SystemSettings(req.body);
    } else {
      Object.assign(settings, req.body);
    }
    settings.updatedBy = req.user?._id;
    await settings.save();

    await recordAuditLog({
      performedBy: req.user,
      action: "UPDATE_COMPANY_INFO",
      module: "SYSTEM_CONFIG",
      details: {
        companyName: settings.companyName,
        phone: settings.phone,
        email: settings.email,
        address: settings.address,
      },
    });

    res.status(200).json(ApiResponse.success(settings, "Company information and system settings updated successfully"));
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(200);
    res.status(200).json(ApiResponse.success(logs));
  } catch (error) {
    next(error);
  }
};
