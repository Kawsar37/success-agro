import mongoose, { Schema, Document } from "mongoose";

export interface IDealer extends Document {
  dealerCode: string;
  businessName: string;
  proprietorName: string;
  phone: string;
  secondaryPhone?: string;
  email?: string;
  address: string;
  territory: mongoose.Types.ObjectId;
  assignedSalesOfficer?: mongoose.Types.ObjectId;
  creditLimit: number;
  monthlyCollectionPercentage?: number;
  currentBalance: number; // positive = dealer owes us money
  openingBalance: number;
  status: "Active" | "Inactive" | "Blacklisted";
  tradeLicenseNumber?: string;
  nidNumber?: string;
  securityChequeDetails?: string;
  createdAt: Date;
  updatedAt: Date;
}

const dealerSchema = new Schema<IDealer>(
  {
    dealerCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    businessName: { type: String, required: true, trim: true },
    proprietorName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    secondaryPhone: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    address: { type: String, required: true, trim: true },
    territory: { type: Schema.Types.ObjectId, ref: "Territory", required: true },
    assignedSalesOfficer: { type: Schema.Types.ObjectId, ref: "SalesOfficer" },
    creditLimit: { type: Number, default: 0 },
    monthlyCollectionPercentage: { type: Number, default: 25 },
    currentBalance: { type: Number, default: 0 },
    openingBalance: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Blacklisted"],
      default: "Active",
    },
    tradeLicenseNumber: { type: String, trim: true },
    nidNumber: { type: String, trim: true },
    securityChequeDetails: { type: String, trim: true },
  },
  { timestamps: true }
);

export const Dealer: mongoose.Model<IDealer> =
  (mongoose.models.Dealer as any) || mongoose.model<IDealer>("Dealer", dealerSchema);
