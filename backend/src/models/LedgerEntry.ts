import mongoose, { Schema, Document } from "mongoose";

export type EntityType = "DEALER" | "SUPPLIER" | "ACCOUNT";
export type TransactionType =
  | "INVOICE"
  | "COLLECTION"
  | "SALES_RETURN"
  | "EXPENSE"
  | "TRANSFER"
  | "SALARY"
  | "OTHER_INCOME"
  | "ADJUSTMENT"
  | "PURCHASE"
  | "MANUAL_ENTRY"
  | "OPENING_BALANCE";

export interface ILedgerEntry extends Document {
  entityType: EntityType;
  dealer?: mongoose.Types.ObjectId;
  supplier?: mongoose.Types.ObjectId;
  account?: mongoose.Types.ObjectId;
  transactionType: TransactionType;
  referenceNumber: string;
  referenceId?: string;
  date: Date;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
  // Enhanced fields for dealer customer ledger matching Success Agro physical ledger
  invoiceNumber?: string;
  moneyReceiptNumber?: string;
  paymentDate?: Date;
  cashInvoiceAmount?: number;
  adjustmentAmount?: number;
  bonusAmount?: number;
  returnAmount?: number;
  netSales?: number;
  overDues?: number;
  isManual?: boolean;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ledgerEntrySchema = new Schema<ILedgerEntry>(
  {
    entityType: {
      type: String,
      required: true,
      enum: ["DEALER", "SUPPLIER", "ACCOUNT"],
    },
    dealer: { type: Schema.Types.ObjectId, ref: "Dealer" },
    supplier: { type: Schema.Types.ObjectId, ref: "Supplier" },
    account: { type: Schema.Types.ObjectId, ref: "Account" },
    transactionType: {
      type: String,
      required: true,
      enum: [
        "INVOICE",
        "COLLECTION",
        "SALES_RETURN",
        "EXPENSE",
        "TRANSFER",
        "SALARY",
        "OTHER_INCOME",
        "ADJUSTMENT",
        "PURCHASE",
        "MANUAL_ENTRY",
        "OPENING_BALANCE",
      ],
    },
    referenceNumber: { type: String, required: true },
    referenceId: { type: String },
    date: { type: Date, default: Date.now },
    description: { type: String, required: true },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    runningBalance: { type: Number, required: true },
    invoiceNumber: { type: String, trim: true },
    moneyReceiptNumber: { type: String, trim: true },
    paymentDate: { type: Date },
    cashInvoiceAmount: { type: Number, default: 0 },
    adjustmentAmount: { type: Number, default: 0 },
    bonusAmount: { type: Number, default: 0 },
    returnAmount: { type: Number, default: 0 },
    netSales: { type: Number, default: 0 },
    overDues: { type: Number, default: 0 },
    isManual: { type: Boolean, default: false },
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

ledgerEntrySchema.index({ entityType: 1, dealer: 1, date: 1 });
ledgerEntrySchema.index({ entityType: 1, account: 1, date: 1 });
ledgerEntrySchema.index({ entityType: 1, supplier: 1, date: 1 });

export const LedgerEntry: mongoose.Model<ILedgerEntry> =
  (mongoose.models.LedgerEntry as any) ||
  mongoose.model<ILedgerEntry>("LedgerEntry", ledgerEntrySchema);
