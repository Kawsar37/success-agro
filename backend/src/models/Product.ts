import mongoose, { Schema, Document } from "mongoose";

export interface IProduct extends Document {
  productCode: string;
  name: string;
  banglaName?: string;
  category: mongoose.Types.ObjectId;
  unit: mongoose.Types.ObjectId;
  packSize: string; // e.g., "500 ml", "100 gm", "1 L", "10 kg"
  cartonSize: number; // e.g., 20 units per carton
  tradePrice: number; // Selling price to dealers per unit (BDT)
  mrp: number; // Maximum Retail Price (BDT)
  minimumStockAlert: number;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    productCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    banglaName: { type: String, trim: true },
    category: { type: Schema.Types.ObjectId, ref: "ProductCategory", required: true },
    unit: { type: Schema.Types.ObjectId, ref: "UnitOfMeasurement", required: true },
    packSize: { type: String, required: true, trim: true },
    cartonSize: { type: Number, default: 1 },
    tradePrice: { type: Number, required: true, min: 0 },
    mrp: { type: Number, required: true, min: 0 },
    minimumStockAlert: { type: Number, default: 50 },
    isActive: { type: Boolean, default: true },
    notes: { type: String },
  },
  { timestamps: true }
);

export const Product: mongoose.Model<IProduct> =
  (mongoose.models.Product as any) || mongoose.model<IProduct>("Product", productSchema);
