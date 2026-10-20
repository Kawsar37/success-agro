import mongoose, { Schema, Document } from "mongoose";

export type PaymentStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID";

export interface IInvoiceItem {
  product: mongoose.Types.ObjectId;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
}

export interface IInvoice extends Document {
  invoiceNumber: string; // INV-2026-00001
  salesOrder?: mongoose.Types.ObjectId;
  dealer: mongoose.Types.ObjectId;
  salesOfficer?: mongoose.Types.ObjectId;
  warehouse: mongoose.Types.ObjectId;
  items: IInvoiceItem[];
  subtotal: number;
  discountAmount: number;
  transportCharge: number;
  otherCharges: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: PaymentStatus;
  deliveryMan?: mongoose.Types.ObjectId;
  deliveryStatus?: "Pending" | "Dispatched" | "Delivered";
  deliveryDate?: Date;
  invoiceDate: Date;
  dueDate?: Date;
  isCancelled: boolean;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceItemSchema = new Schema<IInvoiceItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const invoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    salesOrder: { type: Schema.Types.ObjectId, ref: "SalesOrder" },
    dealer: { type: Schema.Types.ObjectId, ref: "Dealer", required: true },
    salesOfficer: { type: Schema.Types.ObjectId, ref: "SalesOfficer" },
    warehouse: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
    items: [invoiceItemSchema],
    subtotal: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    transportCharge: { type: Number, default: 0, min: 0 },
    otherCharges: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    dueAmount: { type: Number, required: true, min: 0 },
    paymentStatus: {
      type: String,
      enum: ["UNPAID", "PARTIALLY_PAID", "PAID"],
      default: "UNPAID",
    },
    deliveryMan: { type: Schema.Types.ObjectId, ref: "User" },
    deliveryStatus: {
      type: String,
      enum: ["Pending", "Dispatched", "Delivered"],
      default: "Pending",
    },
    deliveryDate: { type: Date },
    invoiceDate: { type: Date, default: Date.now },
    dueDate: { type: Date },
    isCancelled: { type: Boolean, default: false },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

invoiceSchema.index({ dealer: 1, invoiceDate: -1 });
invoiceSchema.index({ paymentStatus: 1 });

export const Invoice: mongoose.Model<IInvoice> =
  (mongoose.models.Invoice as any) || mongoose.model<IInvoice>("Invoice", invoiceSchema);

export interface ISalesReturn extends Document {
  returnNumber: string;
  invoice: mongoose.Types.ObjectId;
  dealer: mongoose.Types.ObjectId;
  warehouse: mongoose.Types.ObjectId;
  items: Array<{
    product: mongoose.Types.ObjectId;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    reason: string;
  }>;
  totalRefundAmount: number;
  remarks?: string;
  approvedBy?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const salesReturnSchema = new Schema<ISalesReturn>(
  {
    returnNumber: { type: String, required: true, unique: true },
    invoice: { type: Schema.Types.ObjectId, ref: "Invoice", required: true },
    dealer: { type: Schema.Types.ObjectId, ref: "Dealer", required: true },
    warehouse: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
    items: [
      {
        product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true },
        totalAmount: { type: Number, required: true },
        reason: { type: String, required: true },
      },
    ],
    totalRefundAmount: { type: Number, required: true },
    remarks: { type: String },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const SalesReturn: mongoose.Model<ISalesReturn> =
  (mongoose.models.SalesReturn as any) || mongoose.model<ISalesReturn>("SalesReturn", salesReturnSchema);
