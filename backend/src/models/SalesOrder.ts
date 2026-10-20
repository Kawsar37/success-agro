import mongoose, { Schema, Document } from "mongoose";

export type OrderStatus = "PENDING" | "APPROVED" | "REJECTED" | "CONVERTED" | "CANCELLED";

export interface IOrderItem {
  product: mongoose.Types.ObjectId;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  notes?: string;
}

export interface ISalesOrder extends Document {
  orderNumber: string; // SO-2026-00001
  dealer: mongoose.Types.ObjectId;
  salesOfficer: mongoose.Types.ObjectId;
  items: IOrderItem[];
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  status: OrderStatus;
  orderDate: Date;
  deliveryAddress?: string;
  notes?: string;
  rejectionReason?: string;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    notes: { type: String },
  },
  { _id: false }
);

const salesOrderSchema = new Schema<ISalesOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    dealer: { type: Schema.Types.ObjectId, ref: "Dealer", required: true },
    salesOfficer: { type: Schema.Types.ObjectId, ref: "SalesOfficer", required: true },
    items: [orderItemSchema],
    subtotal: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "CONVERTED", "CANCELLED"],
      default: "PENDING",
    },
    orderDate: { type: Date, default: Date.now },
    deliveryAddress: { type: String },
    notes: { type: String },
    rejectionReason: { type: String },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

salesOrderSchema.index({ salesOfficer: 1, createdAt: -1 });
salesOrderSchema.index({ dealer: 1, createdAt: -1 });
salesOrderSchema.index({ status: 1 });

export const SalesOrder: mongoose.Model<ISalesOrder> =
  (mongoose.models.SalesOrder as any) || mongoose.model<ISalesOrder>("SalesOrder", salesOrderSchema);
