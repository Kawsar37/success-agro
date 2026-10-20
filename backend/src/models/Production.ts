import mongoose, { Schema, Document } from "mongoose";

export interface IBOMItem {
  rawMaterial: mongoose.Types.ObjectId;
  quantityPerUnit: number; // raw material needed per 1 finished good unit
  unitCostEstimate: number;
}

export interface IBOM extends Document {
  product: mongoose.Types.ObjectId;
  name: string;
  version: string;
  items: IBOMItem[];
  estimatedTotalCostPerUnit: number;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const bomItemSchema = new Schema<IBOMItem>(
  {
    rawMaterial: { type: Schema.Types.ObjectId, ref: "RawMaterial", required: true },
    quantityPerUnit: { type: Number, required: true, min: 0.0001 },
    unitCostEstimate: { type: Number, default: 0 },
  },
  { _id: false }
);

const bomSchema = new Schema<IBOM>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true, unique: true },
    name: { type: String, required: true },
    version: { type: String, default: "1.0" },
    items: [bomItemSchema],
    estimatedTotalCostPerUnit: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    notes: { type: String },
  },
  { timestamps: true }
);

export const BOM: mongoose.Model<IBOM> =
  (mongoose.models.BOM as any) || mongoose.model<IBOM>("BOM", bomSchema);

export type ProductionStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface IProductionOrder extends Document {
  orderNumber: string; // PRD-2026-00001
  product: mongoose.Types.ObjectId;
  targetQuantity: number;
  producedQuantity: number;
  wastageQuantity: number;
  batchNumber: string;
  sourceWarehouse: mongoose.Types.ObjectId; // raw material source
  destinationWarehouse: mongoose.Types.ObjectId; // finished goods destination
  status: ProductionStatus;
  startDate?: Date;
  completionDate?: Date;
  totalProductionCost: number;
  perUnitCost: number;
  notes?: string;
  supervisor: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const productionOrderSchema = new Schema<IProductionOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    targetQuantity: { type: Number, required: true, min: 1 },
    producedQuantity: { type: Number, default: 0 },
    wastageQuantity: { type: Number, default: 0 },
    batchNumber: { type: String, required: true },
    sourceWarehouse: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
    destinationWarehouse: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
    status: {
      type: String,
      enum: ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
      default: "PLANNED",
    },
    startDate: { type: Date },
    completionDate: { type: Date },
    totalProductionCost: { type: Number, default: 0 },
    perUnitCost: { type: Number, default: 0 },
    notes: { type: String },
    supervisor: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const ProductionOrder: mongoose.Model<IProductionOrder> =
  (mongoose.models.ProductionOrder as any) ||
  mongoose.model<IProductionOrder>("ProductionOrder", productionOrderSchema);
