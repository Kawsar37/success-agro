import mongoose, { Schema, Document } from "mongoose";

export type NotificationType =
  | "ORDER_CREATED"
  | "ORDER_STATUS_CHANGED"
  | "DELIVERY_PICKED_UP"
  | "DELIVERY_COMPLETED"
  | "PAYMENT_COLLECTED"
  | "GENERAL";

export interface INotification extends Document {
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  metadata?: Record<string, any>;
  recipientRole?: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: [
        "ORDER_CREATED",
        "ORDER_STATUS_CHANGED",
        "DELIVERY_PICKED_UP",
        "DELIVERY_COMPLETED",
        "PAYMENT_COLLECTED",
        "GENERAL",
      ],
      default: "GENERAL",
    },
    link: { type: String },
    metadata: { type: Schema.Types.Mixed },
    recipientRole: { type: String, default: "Admin" },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ recipientRole: 1, createdAt: -1 });
notificationSchema.index({ isRead: 1 });

export const Notification: mongoose.Model<INotification> =
  (mongoose.models.Notification as any) ||
  mongoose.model<INotification>("Notification", notificationSchema);

export async function createNotification(data: {
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  metadata?: Record<string, any>;
  recipientRole?: string;
}): Promise<INotification | null> {
  try {
    return await Notification.create({
      ...data,
      recipientRole: data.recipientRole || "Admin",
      isRead: false,
    });
  } catch (err) {
    console.error("Failed to create notification:", err);
    return null;
  }
}
