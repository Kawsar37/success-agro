import { AuditLog } from "../models/AuditAndSettings.js";
import { logger } from "./logger.js";

export const logAuditEvent = async (params: {
  userId?: string;
  userName?: string;
  action: string;
  module?: string;
  entity?: string;
  entityId?: string;
  performedBy?: any;
  targetId?: string;
  details?: any;
  ipAddress?: string;
}) => {
  try {
    const user = params.userId || params.performedBy?._id?.toString();
    const userName = params.userName || params.performedBy?.name || "System";
    const module = params.module || params.entity || "SYSTEM";
    const targetId = params.targetId || params.entityId;

    await AuditLog.create({
      user,
      userName,
      action: params.action,
      module,
      targetId,
      details: params.details,
      ipAddress: params.ipAddress,
    });
  } catch (err) {
    logger.warn(`Failed to write audit log: ${err}`);
  }
};

export const recordAuditLog = logAuditEvent;
