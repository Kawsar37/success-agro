import { Response, NextFunction } from "express";
import { AuthRequest } from "../middlewares/auth.js";
import { Employee, SalaryPayment } from "../models/Employee.js";
import { Account } from "../models/FinancialAccounts.js";
import { LedgerEntry } from "../models/LedgerEntry.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { generateSequentialId, generateSimpleId } from "../utils/idGenerator.js";

export const getEmployees = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const employees = await Employee.find().sort({ name: 1 });
    res.status(200).json(ApiResponse.success(employees));
  } catch (error) {
    next(error);
  }
};

export const createEmployee = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const employeeId = await generateSimpleId("EMP", "employee");
    const employee = await Employee.create({
      ...req.body,
      employeeId,
    });
    res.status(201).json(ApiResponse.success(employee, "Employee registered successfully"));
  } catch (error) {
    next(error);
  }
};

export const getSalaryPayments = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payments = await SalaryPayment.find()
      .populate("employee", "employeeId name designation department monthlySalary")
      .populate("account", "name type")
      .populate("paidBy", "name")
      .sort({ paymentDate: -1 });
    res.status(200).json(ApiResponse.success(payments));
  } catch (error) {
    next(error);
  }
};

export const recordSalaryPayment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      employeeId,
      salaryMonth,
      baseSalary,
      bonusAmount = 0,
      deductionAmount = 0,
      accountId,
      paymentMethod = "BankTransfer",
      remarks,
    } = req.body;

    const employee = await Employee.findById(employeeId);
    if (!employee) throw new ApiError(404, "Employee not found");

    const account = await Account.findById(accountId);
    if (!account) throw new ApiError(404, "Payment account not found");

    const netPayable = baseSalary + bonusAmount - deductionAmount;
    const paymentNumber = await generateSequentialId("SAL", "salary_payment");

    const payment = await SalaryPayment.create({
      paymentNumber,
      employee: employee._id,
      salaryMonth,
      baseSalary,
      bonusAmount,
      deductionAmount,
      netPayable,
      account: account._id,
      paymentMethod,
      remarks,
      paidBy: req.user?._id,
    });

    account.currentBalance -= netPayable;
    await account.save();

    await LedgerEntry.create({
      entityType: "ACCOUNT",
      account: account._id,
      transactionType: "SALARY",
      referenceNumber: paymentNumber,
      referenceId: (payment._id as any).toString(),
      date: payment.paymentDate,
      description: `Salary disbursement to ${employee.name} for ${salaryMonth}`,
      debit: 0,
      credit: netPayable,
      runningBalance: account.currentBalance,
      createdBy: req.user?._id,
    });

    res.status(201).json(ApiResponse.success(payment, "Salary disbursed and recorded successfully"));
  } catch (error) {
    next(error);
  }
};
