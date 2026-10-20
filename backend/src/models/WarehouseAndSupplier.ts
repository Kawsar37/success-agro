import mongoose, { Schema, Document } from "mongoose";

export interface IWarehouse extends Document {
  code: string;
  name: string;
  location: string;
  type: "Central" | "Factory" | "Regional";
  contactPerson?: string;
  contactPhone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const warehouseSchema = new Schema<IWarehouse>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["Central", "Factory", "Regional"],
      default: "Central",
    },
    contactPerson: { type: String, trim: true },
    contactPhone: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Warehouse: mongoose.Model<IWarehouse> =
  (mongoose.models.Warehouse as any) || mongoose.model<IWarehouse>("Warehouse", warehouseSchema);

export interface ISupplier extends Document {
  supplierCode: string;
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address: string;
  suppliedItems?: string;
  currentBalance: number; // positive = we owe the supplier
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const supplierSchema = new Schema<ISupplier>(
  {
    supplierCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    address: { type: String, required: true, trim: true },
    suppliedItems: { type: String },
    currentBalance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Supplier: mongoose.Model<ISupplier> =
  (mongoose.models.Supplier as any) || mongoose.model<ISupplier>("Supplier", supplierSchema);
