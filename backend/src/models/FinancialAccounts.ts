import mongoose, { Schema, Document } from "mongoose";

export type AccountType = "Cash" | "Bank" | "MobileBanking";

export interface IAccount extends Document {
  name: string; // e.g. "Petty Cash", "Islami Bank Current A/C", "bKash Merchant"
  type: AccountType;
  accountNumber?: string;
  bankName?: string;
  branchName?: string;
  routingNumber?: string;
  currentBalance: number;
  openingBalance: number;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const accountSchema = new Schema<IAccount>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    type: { type: String, required: true, enum: ["Cash", "Bank", "MobileBanking"] },
    accountNumber: { type: String, trim: true },
    bankName: { type: String, trim: true },
    branchName: { type: String, trim: true },
    routingNumber: { type: String, trim: true },
    currentBalance: { type: Number, default: 0 },
    openingBalance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    notes: { type: String },
  },
  { timestamps: true }
);

export const Account: mongoose.Model<IAccount> =
  (mongoose.models.Account as any) || mongoose.model<IAccount>("Account", accountSchema);

export interface IAccountTransfer extends Document {
  transferNumber: string;
  fromAccount: mongoose.Types.ObjectId;
  toAccount: mongoose.Types.ObjectId;
  amount: number;
  transferDate: Date;
  referenceNumber?: string;
  remarks?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const accountTransferSchema = new Schema<IAccountTransfer>(
  {
    transferNumber: { type: String, required: true, unique: true },
    fromAccount: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    toAccount: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    amount: { type: Number, required: true, min: 1 },
    transferDate: { type: Date, default: Date.now },
    referenceNumber: { type: String },
    remarks: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const AccountTransfer: mongoose.Model<IAccountTransfer> =
  (mongoose.models.AccountTransfer as any) ||
  mongoose.model<IAccountTransfer>("AccountTransfer", accountTransferSchema);

export type PaymentMethod = "Cash" | "BankTransfer" | "Cheque" | "bKash" | "Nagad" | "Rocket";
export type CollectionStatus = "Pending" | "Approved" | "Rejected";

export interface ICollection extends Document {
  collectionNumber: string; // COL-2026-00001
  dealer: mongoose.Types.ObjectId;
  invoice?: mongoose.Types.ObjectId;
  salesOfficer?: mongoose.Types.ObjectId;
  account: mongoose.Types.ObjectId;
  amount: number;
  paymentMethod: PaymentMethod;
  collectionDate: Date;
  depositDate?: Date;
  moneyReceiptNumber?: string;
  depositSlipNumber?: string;
  chequeNumber?: string;
  chequeBank?: string;
  chequeDate?: Date;
  chequeStatus?: "Pending" | "Cleared" | "Bounced";
  transactionId?: string;
  remarks?: string;
  receiptNumber?: string;
  receiptImageUrl?: string;
  status: CollectionStatus;
  approvedBy?: mongoose.Types.ObjectId;
  approvalDate?: Date;
  rejectionReason?: string;
  collectedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const collectionSchema = new Schema<ICollection>(
  {
    collectionNumber: { type: String, required: true, unique: true },
    dealer: { type: Schema.Types.ObjectId, ref: "Dealer", required: true },
    invoice: { type: Schema.Types.ObjectId, ref: "Invoice" },
    salesOfficer: { type: Schema.Types.ObjectId, ref: "SalesOfficer" },
    account: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    amount: { type: Number, required: true, min: 1 },
    paymentMethod: {
      type: String,
      required: true,
      enum: ["Cash", "BankTransfer", "Cheque", "bKash", "Nagad", "Rocket"],
    },
    collectionDate: { type: Date, default: Date.now },
    depositDate: { type: Date },
    moneyReceiptNumber: { type: String, trim: true },
    depositSlipNumber: { type: String, trim: true },
    receiptImageUrl: { type: String, trim: true },
    chequeNumber: { type: String },
    chequeBank: { type: String },
    chequeDate: { type: Date },
    chequeStatus: {
      type: String,
      enum: ["Pending", "Cleared", "Bounced"],
      default: "Cleared",
    },
    transactionId: { type: String },
    remarks: { type: String },
    receiptNumber: { type: String },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvalDate: { type: Date },
    rejectionReason: { type: String },
    collectedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const Collection: mongoose.Model<ICollection> =
  (mongoose.models.Collection as any) || mongoose.model<ICollection>("Collection", collectionSchema);

