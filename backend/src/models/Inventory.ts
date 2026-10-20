import mongoose, { Schema, Document } from "mongoose";

export interface IRawMaterial extends Document {
  materialCode: string;
  name: string;
  category: string;
  unit: mongoose.Types.ObjectId;
  minimumStockAlert: number;
  averageCost: number;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const rawMaterialSchema = new Schema<IRawMaterial>(
  {
    materialCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    unit: { type: Schema.Types.ObjectId, ref: "UnitOfMeasurement", required: true },
    minimumStockAlert: { type: Number, default: 10 },
    averageCost: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    notes: { type: String },
  },
  { timestamps: true }
);

export const RawMaterial: mongoose.Model<IRawMaterial> =
  (mongoose.models.RawMaterial as any) || mongoose.model<IRawMaterial>("RawMaterial", rawMaterialSchema);

export interface IInventoryBalance extends Document {
  warehouse: mongoose.Types.ObjectId;
  itemType: "FinishedGood" | "RawMaterial";
  product?: mongoose.Types.ObjectId;
  rawMaterial?: mongoose.Types.ObjectId;
  quantityOnHand: number;
  reservedQuantity: number;
  availableQuantity: number;
  batchNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryBalanceSchema = new Schema<IInventoryBalance>(
  {
    warehouse: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
    itemType: {
      type: String,
      required: true,
      enum: ["FinishedGood", "RawMaterial"],
    },
    product: { type: Schema.Types.ObjectId, ref: "Product" },
    rawMaterial: { type: Schema.Types.ObjectId, ref: "RawMaterial" },
    quantityOnHand: { type: Number, default: 0 },
    reservedQuantity: { type: Number, default: 0 },
    availableQuantity: { type: Number, default: 0 },
    batchNumber: { type: String },
  },
  { timestamps: true }
);

inventoryBalanceSchema.index(
  { warehouse: 1, itemType: 1, product: 1, rawMaterial: 1 },
  { unique: true }
);

export const InventoryBalance: mongoose.Model<IInventoryBalance> =
  (mongoose.models.InventoryBalance as any) ||
  mongoose.model<IInventoryBalance>("InventoryBalance", inventoryBalanceSchema);

export type MovementType =
  | "PURCHASE_RECEIPT"
  | "PRODUCTION_CONSUMPTION"
  | "PRODUCTION_OUTPUT"
  | "SALES_DISPATCH"
  | "SALES_RETURN"
  | "WAREHOUSE_TRANSFER"
  | "STOCK_ADJUSTMENT";

export interface IStockMovement extends Document {
  movementNumber: string;
  type: MovementType;
  itemType: "FinishedGood" | "RawMaterial";
  product?: mongoose.Types.ObjectId;
  rawMaterial?: mongoose.Types.ObjectId;
  sourceWarehouse?: mongoose.Types.ObjectId;
  destinationWarehouse?: mongoose.Types.ObjectId;
  quantity: number;
  unitCost?: number;
  totalCost?: number;
  referenceType?: "SalesInvoice" | "ProductionOrder" | "PurchaseOrder" | "Adjustment";
  referenceId?: string;
  remarks?: string;
  performedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const stockMovementSchema = new Schema<IStockMovement>(
  {
    movementNumber: { type: String, required: true, unique: true },
    type: {
      type: String,
      required: true,
      enum: [
        "PURCHASE_RECEIPT",
        "PRODUCTION_CONSUMPTION",
        "PRODUCTION_OUTPUT",
        "SALES_DISPATCH",
        "SALES_RETURN",
        "WAREHOUSE_TRANSFER",
        "STOCK_ADJUSTMENT",
      ],
    },
    itemType: {
      type: String,
      required: true,
      enum: ["FinishedGood", "RawMaterial"],
    },
    product: { type: Schema.Types.ObjectId, ref: "Product" },
    rawMaterial: { type: Schema.Types.ObjectId, ref: "RawMaterial" },
    sourceWarehouse: { type: Schema.Types.ObjectId, ref: "Warehouse" },
    destinationWarehouse: { type: Schema.Types.ObjectId, ref: "Warehouse" },
    quantity: { type: Number, required: true },
    unitCost: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    referenceType: { type: String },
    referenceId: { type: String },
    remarks: { type: String },
    performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const StockMovement: mongoose.Model<IStockMovement> =
  (mongoose.models.StockMovement as any) ||
  mongoose.model<IStockMovement>("StockMovement", stockMovementSchema);
