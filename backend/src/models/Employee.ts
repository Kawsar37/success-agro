import mongoose, { Schema, Document } from "mongoose";

export interface IEmployee extends Document {
  employeeId: string; // EMP-0001
  name: string;
  phone: string;
  designation: string;
  department: "Management" | "Production" | "Sales" | "Accounts" | "Warehouse" | "General";
  joiningDate: Date;
  monthlySalary: number;
  bankAccountNumber?: string;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const employeeSchema = new Schema<IEmployee>(
  {
    employeeId: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    designation: { type: String, required: true, trim: true },
    department: {
      type: String,
      required: true,
      enum: ["Management", "Production", "Sales", "Accounts", "Warehouse", "General"],
    },
    joiningDate: { type: Date, default: Date.now },
    monthlySalary: { type: Number, required: true, min: 0 },
    bankAccountNumber: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    notes: { type: String },
  },
  { timestamps: true }
);

export const Employee: mongoose.Model<IEmployee> =
  (mongoose.models.Employee as any) || mongoose.model<IEmployee>("Employee", employeeSchema);

export interface ISalaryPayment extends Document {
  paymentNumber: string; // SAL-2026-00001
  employee: mongoose.Types.ObjectId;
  salaryMonth: string; // e.g., "2026-05"
  baseSalary: number;
  bonusAmount: number;
  deductionAmount: number;
  netPayable: number;
  account: mongoose.Types.ObjectId;
  paymentDate: Date;
  paymentMethod: "Cash" | "BankTransfer" | "bKash";
  remarks?: string;
  paidBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const salaryPaymentSchema = new Schema<ISalaryPayment>(
  {
    paymentNumber: { type: String, required: true, unique: true },
    employee: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    salaryMonth: { type: String, required: true },
    baseSalary: { type: Number, required: true },
    bonusAmount: { type: Number, default: 0 },
    deductionAmount: { type: Number, default: 0 },
    netPayable: { type: Number, required: true },
    account: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    paymentDate: { type: Date, default: Date.now },
    paymentMethod: {
      type: String,
      required: true,
      enum: ["Cash", "BankTransfer", "bKash"],
      default: "BankTransfer",
    },
    remarks: { type: String },
    paidBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const SalaryPayment: mongoose.Model<ISalaryPayment> =
  (mongoose.models.SalaryPayment as any) ||
  mongoose.model<ISalaryPayment>("SalaryPayment", salaryPaymentSchema);
