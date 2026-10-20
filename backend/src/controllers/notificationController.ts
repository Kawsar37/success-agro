import { Response, NextFunction } from "express";
import { AuthRequest } from "../middlewares/auth.js";
import { Notification } from "../models/Notification.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";

export const getNotifications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 40));
    const unreadOnly = req.query.unreadOnly === "true";

    const filter: any = {
      recipientRole: { $in: ["Admin", "ManagingDirector", "All"] },
    };

    if (unreadOnly) {
      filter.isRead = false;
    }

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit),
      Notification.countDocuments({
        recipientRole: { $in: ["Admin", "ManagingDirector", "All"] },
        isRead: false,
      }),
    ]);

    res.status(200).json(
      ApiResponse.success(
        {
          notifications,
          unreadCount,
        },
        "Notifications retrieved successfully"
      )
    );
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      throw new ApiError(404, "Notification not found");
    }

    res.status(200).json(ApiResponse.success(notification, "Notification marked as read"));
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await Notification.updateMany(
      {
        recipientRole: { $in: ["Admin", "ManagingDirector", "All"] },
        isRead: false,
      },
      { isRead: true }
    );

    res.status(200).json(ApiResponse.success(null, "All notifications marked as read"));
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) {
      throw new ApiError(404, "Notification not found");
    }

    res.status(200).json(ApiResponse.success(null, "Notification deleted successfully"));
  } catch (error) {
    next(error);
  }
};
