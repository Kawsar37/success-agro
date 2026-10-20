import { Response, NextFunction } from "express";
import { Invoice } from "../models/Invoice.js";
import { SalesOrder } from "../models/SalesOrder.js";
import { Collection, Account } from "../models/FinancialAccounts.js";
import { Dealer } from "../models/Dealer.js";
import { InventoryBalance } from "../models/Inventory.js";
import { Product } from "../models/Product.js";
import { Expense, OtherIncome } from "../models/ExpenseAndIncome.js";
import { ProductionOrder } from "../models/Production.js";
import { AuthRequest } from "../middlewares/auth.js";
import { ApiResponse } from "../utils/apiResponse.js";

export const getDashboardMetrics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userRole = req.user?.role;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Sales Officer special scoped dashboard
    if (userRole === "SalesOfficer") {
      const officerId = req.user?.salesOfficerProfile;
      const [totalOrders, pendingOrders, approvedOrders, recentOrders] = await Promise.all([
        SalesOrder.countDocuments({ salesOfficer: officerId }),
        SalesOrder.countDocuments({ salesOfficer: officerId, status: "PENDING" }),
        SalesOrder.countDocuments({ salesOfficer: officerId, status: "APPROVED" }),
        SalesOrder.find({ salesOfficer: officerId })
          .populate("dealer", "businessName proprietorName phone")
          .sort({ createdAt: -1 })
          .limit(5),
      ]);

      res.status(200).json(
        ApiResponse.success({
          role: "SalesOfficer",
          metrics: {
            totalOrders,
            pendingOrders,
            approvedOrders,
          },
          recentOrders,
        })
      );
      return;
    }

    // Executive/Management Dashboard
    const [
      todaySalesAgg,
      monthSalesAgg,
      todayCollectionsAgg,
      dealersReceivablesAgg,
      accountsList,
      totalExpensesAgg,
      pendingOrdersCount,
      inProgressProductions,
      recentInvoices,
    ] = await Promise.all([
      Invoice.aggregate([
        { $match: { invoiceDate: { $gte: todayStart }, isCancelled: false } },
        { $group: { _id: null, total: { $sum: "$grandTotal" } } },
      ]),
      Invoice.aggregate([
        { $match: { invoiceDate: { $gte: monthStart }, isCancelled: false } },
        { $group: { _id: null, total: { $sum: "$grandTotal" } } },
      ]),
      Collection.aggregate([
        { $match: { collectionDate: { $gte: todayStart } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Dealer.aggregate([
        { $match: { status: "Active" } },
        { $group: { _id: null, total: { $sum: "$currentBalance" } } },
      ]),
      Account.find({ isActive: true }).select("name type currentBalance"),
      Expense.aggregate([
        { $match: { expenseDate: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      SalesOrder.countDocuments({ status: "PENDING" }),
      ProductionOrder.countDocuments({ status: "IN_PROGRESS" }),
      Invoice.find({ isCancelled: false })
        .populate("dealer", "businessName proprietorName")
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    const todaySales = todaySalesAgg[0]?.total || 0;
    const monthlySales = monthSalesAgg[0]?.total || 0;
    const todayCollections = todayCollectionsAgg[0]?.total || 0;
    const totalReceivables = dealersReceivablesAgg[0]?.total || 0;
    const totalCashBank = accountsList.reduce((acc, a) => acc + (a.currentBalance || 0), 0);
    const monthlyExpenses = totalExpensesAgg[0]?.total || 0;
    const grossProfit = Math.round(monthlySales * 0.28);
    const netProfit = grossProfit - monthlyExpenses;

    res.status(200).json(
      ApiResponse.success({
        metrics: {
          todaySales,
          monthlySales,
          todayCollections,
          totalReceivables,
          totalCashBank,
          monthlyExpenses,
          pendingOrders: pendingOrdersCount,
          activeProductions: inProgressProductions,
          grossProfit,
          netProfit,
        },
        recentInvoices,
        accounts: accountsList,
      })
    );
  } catch (error) {
    next(error);
  }
};

export const getExecutiveDashboardMetrics = getDashboardMetrics;

export const getSalesReport = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const invoices = await Invoice.find({ isCancelled: false })
      .populate("dealer", "dealerCode businessName territory")
      .populate("salesOfficer", "officerCode name")
      .sort({ invoiceDate: -1 });
    res.status(200).json(ApiResponse.success(invoices));
  } catch (error) {
    next(error);
  }
};

export const getFinancialReport = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [invoices, expenses, collections, otherIncome] = await Promise.all([
      Invoice.aggregate([
        { $match: { isCancelled: false } },
        { $group: { _id: null, total: { $sum: "$grandTotal" }, paid: { $sum: "$paidAmount" }, due: { $sum: "$dueAmount" } } },
      ]),
      Expense.aggregate([
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Collection.aggregate([
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      OtherIncome.aggregate([
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    const totalSales = invoices[0]?.total || 0;
    const totalCollected = collections[0]?.total || 0;
    const totalExpenses = expenses[0]?.total || 0;
    const totalOtherIncome = otherIncome[0]?.total || 0;

    res.status(200).json(
      ApiResponse.success({
        totalSales,
        totalCollected,
        totalExpenses,
        totalOtherIncome,
        netCashFlow: totalCollected + totalOtherIncome - totalExpenses,
      })
    );
  } catch (error) {
    next(error);
  }
};

export const getProfitLossReport = getFinancialReport;

export const getProductionReport = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const orders = await ProductionOrder.find()
      .populate("product", "productCode name packSize")
      .sort({ createdAt: -1 });
    res.status(200).json(ApiResponse.success(orders));
  } catch (error) {
    next(error);
  }
};

export const getInventoryReport = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const balances = await InventoryBalance.find()
      .populate("warehouse", "code name")
      .populate("product", "productCode name packSize tradePrice")
      .populate("rawMaterial", "materialCode name averageCost");
    res.status(200).json(ApiResponse.success(balances));
  } catch (error) {
    next(error);
  }
};
