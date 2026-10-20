import mongoose, { Schema, Document } from "mongoose";

export interface IAuditLog extends Document {
  user?: mongoose.Types.ObjectId;
  userName: string;
  action: string;
  module: string;
  targetId?: string;
  details?: any;
  ipAddress?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    userName: { type: String, default: "System" },
    action: { type: String, required: true },
    module: { type: String, required: true },
    targetId: { type: String },
    details: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ createdAt: -1 });

export const AuditLog: mongoose.Model<IAuditLog> =
  (mongoose.models.AuditLog as any) || mongoose.model<IAuditLog>("AuditLog", auditLogSchema);

export interface ISystemSettings extends Document {
  companyName: string;
  tagline?: string;
  address: string;
  phone: string;
  email: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  vatTaxRegistrationNumber?: string;
  invoiceFooterMessage?: string;
  termsAndConditions?: string;
  updatedBy?: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const systemSettingsSchema = new Schema<ISystemSettings>(
  {
    companyName: { type: String, default: "Success Agro Limited" },
    tagline: { type: String, default: "Quality Agro Solutions for Bangladesh" },
    address: { type: String, default: "Plot 42, BSCIC Industrial Estate, Bogura, Bangladesh" },
    phone: { type: String, default: "+8801712345678" },
    email: { type: String, default: "info@successagro.com.bd" },
    currency: { type: String, default: "BDT" },
    currencySymbol: { type: String, default: "৳" },
    timezone: { type: String, default: "Asia/Dhaka" },
    vatTaxRegistrationNumber: { type: String, default: "BIN-123456789-0101" },
    invoiceFooterMessage: {
      type: String,
      default: "Thank you for your business. For queries, contact customer care.",
    },
    termsAndConditions: {
      type: String,
      default: "Goods once sold cannot be returned without prior written factory approval.",
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const SystemSettings: mongoose.Model<ISystemSettings> =
  (mongoose.models.SystemSettings as any) ||
  mongoose.model<ISystemSettings>("SystemSettings", systemSettingsSchema);
