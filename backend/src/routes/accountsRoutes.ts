import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorize.js";
import { blockSalesOfficerFromModule } from "../middlewares/salesOfficerGuard.js";
import {
  getAccounts,
  createAccount,
  updateAccount,
  recordManualAdjustment,
  transferFunds,
  getTransfers,
  getDepositAccounts,
  getPendingCollectionsCount,
  getCollections,
  recordCollection,
  approveCollection,
  rejectCollection,
  deleteCollection,
  getExpenses,
  recordExpense,
  getLedgerEntries,
  getDealersLedgerSummary,
  getDealerLedger,
  addDealerLedgerEntry,
  updateDealerLedgerEntry,
  deleteDealerLedgerEntry,
  getSalesOfficersList,
  getSalesOfficerLedger,
} from "../controllers/accountsController.js";

const router = Router();
router.use(authenticate);

// Collections & Bank Deposit Workflow
// Sales Officers can submit collections & view their own; Admin manages, approves, rejects
router.get("/collections/pending-count", getPendingCollectionsCount);
router.get("/collections/deposit-accounts", getDepositAccounts);
router.get("/collections", getCollections);
router.post(
  "/collections",
  authorize("ManagingDirector", "Admin", "SalesOfficer"),
  recordCollection
);
router.patch(
  "/collections/:id/approve",
  authorize("ManagingDirector", "Admin"),
  approveCollection
);
router.patch(
  "/collections/:id/reject",
  authorize("ManagingDirector", "Admin"),
  rejectCollection
);
router.delete(
  "/collections/:id",
  authorize("ManagingDirector", "Admin"),
  deleteCollection
);

// All general accounts, expenses, transfers, and general accounting entries blocked for Sales Officers
router.use(blockSalesOfficerFromModule);

// Customer Ledger (Image 1) & Sales Officer Dealer Ledger (Image 2)
// Accessible strictly by Admin and Managing Director
router.get("/dealers-ledger-summary", getDealersLedgerSummary);
router.get("/dealer-ledger/:dealerId", getDealerLedger);
router.get("/sales-officers-list", getSalesOfficersList);
router.get("/sales-officer-ledger/:officerId", getSalesOfficerLedger);

// Ledger Modifications strictly restricted to Admin / Managing Director
router.post("/dealer-ledger", authorize("ManagingDirector", "Admin"), addDealerLedgerEntry);
router.put("/dealer-ledger/:id", authorize("ManagingDirector", "Admin"), updateDealerLedgerEntry);
router.delete("/dealer-ledger/:id", authorize("ManagingDirector", "Admin"), deleteDealerLedgerEntry);

// Cash & Bank Accounts (Manual Admin Management)
router.get("/accounts", getAccounts);
router.post("/accounts", authorize("ManagingDirector", "Admin"), createAccount);
router.put("/accounts/:id", authorize("ManagingDirector", "Admin"), updateAccount);

// Manual Cash In / Cash Out & Transfers
router.post("/manual-adjustment", authorize("ManagingDirector", "Admin"), recordManualAdjustment);
router.post("/transfer", authorize("ManagingDirector", "Admin"), transferFunds);
router.get("/transfers", getTransfers);

// Expenses
router.get("/expenses", getExpenses);
router.post("/expenses", authorize("ManagingDirector", "Admin"), recordExpense);

// Generic Ledger (backward compatible)
router.get("/ledger", getLedgerEntries);

export default router;
