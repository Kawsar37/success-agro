import mongoose, { Schema, Document } from "mongoose";

export interface IExpenseCategory extends Document {
  name: string; // e.g. "Factory Rent", "Raw Material Transport", "Electricity", "Office Supplies"
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const expenseCategorySchema = new Schema<IExpenseCategory>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const ExpenseCategory: mongoose.Model<IExpenseCategory> =
  (mongoose.models.ExpenseCategory as any) ||
  mongoose.model<IExpenseCategory>("ExpenseCategory", expenseCategorySchema);

export interface IExpense extends Document {
  expenseNumber: string; // EXP-2026-00001
  category: mongoose.Types.ObjectId;
  account: mongoose.Types.ObjectId;
  amount: number;
  expenseDate: Date;
  payeeName?: string;
  paymentMethod: "Cash" | "BankTransfer" | "Cheque" | "bKash" | "Nagad";
  referenceNumber?: string;
  notes?: string;
  receiptAttachment?: string;
  approvedBy?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
  {
    expenseNumber: { type: String, required: true, unique: true },
    category: { type: Schema.Types.ObjectId, ref: "ExpenseCategory", required: true },
    account: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    amount: { type: Number, required: true, min: 1 },
    expenseDate: { type: Date, default: Date.now },
    payeeName: { type: String, trim: true },
    paymentMethod: {
      type: String,
      required: true,
      enum: ["Cash", "BankTransfer", "Cheque", "bKash", "Nagad"],
      default: "Cash",
    },
    referenceNumber: { type: String },
    notes: { type: String },
    receiptAttachment: { type: String },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const Expense: mongoose.Model<IExpense> =
  (mongoose.models.Expense as any) || mongoose.model<IExpense>("Expense", expenseSchema);

export interface IOtherIncome extends Document {
  incomeNumber: string;
  source: string; // e.g., "Scrap packaging sales", "Machinery rental"
  account: mongoose.Types.ObjectId;
  amount: number;
  incomeDate: Date;
  receivedFrom?: string;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const otherIncomeSchema = new Schema<IOtherIncome>(
  {
    incomeNumber: { type: String, required: true, unique: true },
    source: { type: String, required: true, trim: true },
    account: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    amount: { type: Number, required: true, min: 1 },
    incomeDate: { type: Date, default: Date.now },
    receivedFrom: { type: String, trim: true },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const OtherIncome: mongoose.Model<IOtherIncome> =
  (mongoose.models.OtherIncome as any) || mongoose.model<IOtherIncome>("OtherIncome", otherIncomeSchema);
