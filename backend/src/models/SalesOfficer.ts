import mongoose, { Schema, Document } from "mongoose";

export interface ISalesOfficer extends Document {
  user: mongoose.Types.ObjectId;
  officerCode: string;
  name: string;
  phone: string;
  email?: string;
  territory: mongoose.Types.ObjectId;
  targetMonthlyAmount: number;
  commissionRate: number;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const salesOfficerSchema = new Schema<ISalesOfficer>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    officerCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    territory: { type: Schema.Types.ObjectId, ref: "Territory", required: true },
    targetMonthlyAmount: { type: Number, default: 0 },
    commissionRate: { type: Number, default: 0 }, // percentage e.g. 2.5
    isActive: { type: Boolean, default: true },
    notes: { type: String },
  },
  { timestamps: true }
);

export const SalesOfficer: mongoose.Model<ISalesOfficer> =
  (mongoose.models.SalesOfficer as any) || mongoose.model<ISalesOfficer>("SalesOfficer", salesOfficerSchema);
