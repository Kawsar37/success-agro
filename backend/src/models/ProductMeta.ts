import mongoose, { Schema, Document } from "mongoose";

export interface IProductCategory extends Document {
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<IProductCategory>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const ProductCategory: mongoose.Model<IProductCategory> =
  (mongoose.models.ProductCategory as any) ||
  mongoose.model<IProductCategory>("ProductCategory", categorySchema);

export interface IUnitOfMeasurement extends Document {
  name: string; // e.g. Liter, KG, Pack, Carton, Bottle
  symbol: string; // e.g. L, kg, pkt, ctn, btl
  baseType: "weight" | "volume" | "piece" | "package";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const uomSchema = new Schema<IUnitOfMeasurement>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    symbol: { type: String, required: true, trim: true },
    baseType: {
      type: String,
      required: true,
      enum: ["weight", "volume", "piece", "package"],
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const UnitOfMeasurement: mongoose.Model<IUnitOfMeasurement> =
  (mongoose.models.UnitOfMeasurement as any) ||
  mongoose.model<IUnitOfMeasurement>("UnitOfMeasurement", uomSchema);
