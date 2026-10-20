import { Response, NextFunction } from "express";
import { AuthRequest } from "../middlewares/auth.js";
import { Account, AccountTransfer, Collection } from "../models/FinancialAccounts.js";
import { Expense, ExpenseCategory, OtherIncome } from "../models/ExpenseAndIncome.js";
import { Dealer } from "../models/Dealer.js";
import { SalesOfficer } from "../models/SalesOfficer.js";
import { Invoice } from "../models/Invoice.js";
import { LedgerEntry } from "../models/LedgerEntry.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { generateSequentialId } from "../utils/idGenerator.js";
import { logAuditEvent } from "../utils/auditLogger.js";
import { createNotification } from "../models/Notification.js";

export const getAccounts = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const accounts = await Account.find({ isActive: true }).sort({ name: 1 });
    res.status(200).json(ApiResponse.success(accounts));
  } catch (error) {
    next(error);
  }
};

export const createAccount = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const openingBalance = Number(req.body.openingBalance) || 0;
    const currentBalance = req.body.currentBalance !== undefined ? Number(req.body.currentBalance) : openingBalance;
    const account = await Account.create({
      ...req.body,
      openingBalance,
      currentBalance,
    });

    if (currentBalance > 0) {
      await LedgerEntry.create({
        entityType: "ACCOUNT",
        account: account._id,
        transactionType: "ADJUSTMENT",
        referenceNumber: `OPN-${account._id.toString().slice(-6).toUpperCase()}`,
        date: new Date(),
        description: `Opening balance for ${account.name}`,
        debit: currentBalance,
        credit: 0,
        runningBalance: currentBalance,
        createdBy: req.user?._id,
      });
    }

    res.status(201).json(ApiResponse.success(account, "Financial account created successfully"));
  } catch (error) {
    next(error);
  }
};

export const updateAccount = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, type, bankName, branchName, accountNumber, currentBalance, notes, isActive } = req.body;
    const account = await Account.findById(req.params.id);
    if (!account) throw new ApiError(404, "Account not found");

    if (name) account.name = name;
    if (type) account.type = type;
    if (bankName !== undefined) account.bankName = bankName;
    if (branchName !== undefined) account.branchName = branchName;
    if (accountNumber !== undefined) account.accountNumber = accountNumber;
    if (notes !== undefined) account.notes = notes;
    if (isActive !== undefined) account.isActive = isActive;

    if (currentBalance !== undefined && Number(currentBalance) !== account.currentBalance) {
      const newBal = Number(currentBalance);
      const diff = newBal - account.currentBalance;
      account.currentBalance = newBal;
      await LedgerEntry.create({
        entityType: "ACCOUNT",
        account: account._id,
        transactionType: "ADJUSTMENT",
        referenceNumber: `ADJ-${Date.now().toString().slice(-6)}`,
        date: new Date(),
        description: `Manual balance override by Admin: ${notes || "Manual correction"}`,
        debit: diff > 0 ? diff : 0,
        credit: diff < 0 ? Math.abs(diff) : 0,
        runningBalance: newBal,
        createdBy: req.user?._id,
      });
    }

    await account.save();
    res.status(200).json(ApiResponse.success(account, "Account updated successfully"));
  } catch (error) {
    next(error);
  }
};

export const recordManualAdjustment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { accountId, type, amount, reason, date } = req.body;
    if (!accountId || !type || !amount || Number(amount) <= 0) {
      throw new ApiError(400, "Account, adjustment type (DEPOSIT / WITHDRAWAL), and positive amount are required");
    }

    const account = await Account.findById(accountId);
    if (!account) throw new ApiError(404, "Target financial account not found");

    const numAmount = Number(amount);
    const isDeposit = type === "DEPOSIT";

    if (!isDeposit && account.currentBalance < numAmount) {
      throw new ApiError(400, `Insufficient funds in ${account.name}. Current balance: ৳${account.currentBalance}`);
    }

    if (isDeposit) {
      account.currentBalance += numAmount;
    } else {
      account.currentBalance -= numAmount;
    }

    await account.save();

    const adjRef = await generateSequentialId("ADJ", "adjustment");

    await LedgerEntry.create({
      entityType: "ACCOUNT",
      account: account._id,
      transactionType: "ADJUSTMENT",
      referenceNumber: adjRef,
      date: date ? new Date(date) : new Date(),
      description: `Manual ${isDeposit ? "Cash In / Deposit" : "Cash Out / Withdrawal"}: ${reason || "Admin Manual Entry"}`,
      debit: isDeposit ? numAmount : 0,
      credit: isDeposit ? 0 : numAmount,
      runningBalance: account.currentBalance,
      createdBy: req.user?._id,
    });

    await logAuditEvent({
      userId: (req.user?._id as any)?.toString(),
      userName: req.user?.name,
      action: isDeposit ? "MANUAL_CASH_IN" : "MANUAL_CASH_OUT",
      module: "FINANCE",
      targetId: account.name,
      details: { amount: numAmount, newBalance: account.currentBalance, reason },
      ipAddress: req.ip,
    });

    res.status(200).json(ApiResponse.success(account, `Manual ${isDeposit ? "cash-in / deposit" : "cash-out / withdrawal"} logged successfully`));
  } catch (error) {
    next(error);
  }
};

export const transferFunds = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { fromAccountId, toAccountId, amount, referenceNumber, remarks, date } = req.body;
    if (!fromAccountId || !toAccountId || !amount || Number(amount) <= 0) {
      throw new ApiError(400, "Source account, destination account, and positive transfer amount are required");
    }
    if (String(fromAccountId) === String(toAccountId)) {
      throw new ApiError(400, "Source and destination accounts must be different");
    }

    const fromAccount = await Account.findById(fromAccountId);
    if (!fromAccount) throw new ApiError(404, "Source account not found");

    const toAccount = await Account.findById(toAccountId);
    if (!toAccount) throw new ApiError(404, "Destination account not found");

    const numAmount = Number(amount);
    if (fromAccount.currentBalance < numAmount) {
      throw new ApiError(400, `Insufficient balance in ${fromAccount.name}. Available: ৳${fromAccount.currentBalance}`);
    }

    fromAccount.currentBalance -= numAmount;
    toAccount.currentBalance += numAmount;

    await fromAccount.save();
    await toAccount.save();

    const transferNumber = await generateSequentialId("TRF", "transfer");
    const transfer = await AccountTransfer.create({
      transferNumber,
      fromAccount: fromAccount._id,
      toAccount: toAccount._id,
      amount: numAmount,
      transferDate: date ? new Date(date) : new Date(),
      referenceNumber,
      remarks,
      createdBy: req.user?._id,
    });

    // Ledger for source account
    await LedgerEntry.create({
      entityType: "ACCOUNT",
      account: fromAccount._id,
      transactionType: "TRANSFER",
      referenceNumber: transferNumber,
      referenceId: (transfer._id as any).toString(),
      date: transfer.transferDate,
      description: `Fund transfer to ${toAccount.name}: ${remarks || ""}`,
      debit: 0,
      credit: numAmount,
      runningBalance: fromAccount.currentBalance,
      createdBy: req.user?._id,
    });

    // Ledger for destination account
    await LedgerEntry.create({
      entityType: "ACCOUNT",
      account: toAccount._id,
      transactionType: "TRANSFER",
      referenceNumber: transferNumber,
      referenceId: (transfer._id as any).toString(),
      date: transfer.transferDate,
      description: `Fund transfer from ${fromAccount.name}: ${remarks || ""}`,
      debit: numAmount,
      credit: 0,
      runningBalance: toAccount.currentBalance,
      createdBy: req.user?._id,
    });

    res.status(201).json(ApiResponse.success(transfer, "Funds transferred successfully"));
  } catch (error) {
    next(error);
  }
};

export const getTransfers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const transfers = await AccountTransfer.find()
      .populate("fromAccount", "name type accountNumber")
      .populate("toAccount", "name type accountNumber")
      .populate("createdBy", "name")
      .sort({ transferDate: -1, createdAt: -1 })
      .limit(50);
    res.status(200).json(ApiResponse.success(transfers));
  } catch (error) {
    next(error);
  }
};

export const getDepositAccounts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const accounts = await Account.find({ isActive: true })
      .select("name type accountNumber bankName branchName")
      .sort({ name: 1 });
    res.status(200).json(ApiResponse.success(accounts));
  } catch (error) {
    next(error);
  }
};

export const getPendingCollectionsCount = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const pendingCount = await Collection.countDocuments({ status: "Pending" });
    res.status(200).json(ApiResponse.success({ pendingCount }));
  } catch (error) {
    next(error);
  }
};

export const getCollections = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filter: any = {};
    if (req.user?.role === "SalesOfficer") {
      filter.$or = [
        { salesOfficer: req.user.salesOfficerProfile },
        { collectedBy: req.user._id },
      ];
    } else {
      if (req.query.status) {
        filter.status = req.query.status;
      }
      if (req.query.dealerId) {
        filter.dealer = req.query.dealerId;
      }
    }
    const collections = await Collection.find(filter)
      .populate("dealer", "dealerCode businessName proprietorName phone currentBalance")
      .populate("account", "name type accountNumber bankName")
      .populate("salesOfficer", "officerCode name phone")
      .populate("collectedBy", "name email role")
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1, collectionDate: -1 });

    res.status(200).json(ApiResponse.success(collections));
  } catch (error) {
    next(error);
  }
};

export const recordCollection = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      dealerId,
      invoiceId,
      accountId,
      amount,
      paymentMethod = "BankTransfer",
      moneyReceiptNumber,
      depositSlipNumber,
      receiptImageUrl,
      depositDate,
      chequeNumber,
      chequeBank,
      chequeDate,
      transactionId,
      remarks,
      collectionDate,
    } = req.body;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      throw new ApiError(400, "Collection amount must be a positive number");
    }

    const dealer = await Dealer.findById(dealerId);
    if (!dealer) throw new ApiError(404, "Dealer not found");

    if (
      req.user?.role === "SalesOfficer" &&
      String(dealer.assignedSalesOfficer?._id || dealer.assignedSalesOfficer) !==
        String(req.user.salesOfficerProfile)
    ) {
      throw new ApiError(403, "Access denied: You can only submit collections for your assigned dealers.");
    }

    const account = await Account.findById(accountId);
    if (!account) throw new ApiError(404, "Target bank/cash account not found");

    const isSalesOfficer = req.user?.role === "SalesOfficer";
    const status = isSalesOfficer ? "Pending" : (req.body.status || "Approved");

    const collectionNumber = await generateSequentialId("COL", "collection");
    const collection = await Collection.create({
      collectionNumber,
      dealer: dealer._id,
      invoice: invoiceId || undefined,
      salesOfficer: dealer.assignedSalesOfficer || req.user?.salesOfficerProfile,
      account: account._id,
      amount: numAmount,
      paymentMethod,
      collectionDate: collectionDate ? new Date(collectionDate) : new Date(),
      depositDate: depositDate ? new Date(depositDate) : new Date(),
      moneyReceiptNumber: moneyReceiptNumber?.trim(),
      depositSlipNumber: depositSlipNumber?.trim(),
      receiptImageUrl: receiptImageUrl?.trim() || undefined,
      chequeNumber,
      chequeBank,
      chequeDate,
      transactionId,
      remarks,
      status,
      approvedBy: !isSalesOfficer && status === "Approved" ? req.user?._id : undefined,
      approvalDate: !isSalesOfficer && status === "Approved" ? new Date() : undefined,
      collectedBy: req.user?._id,
    });

    // If Admin created directly with "Approved" status, post to ledger immediately
    if (status === "Approved") {
      const newDealerBalance = dealer.currentBalance - numAmount;
      dealer.currentBalance = newDealerBalance;
      await dealer.save();

      const mrNo = moneyReceiptNumber?.trim() || collectionNumber;

      await LedgerEntry.create({
        entityType: "DEALER",
        dealer: dealer._id,
        transactionType: "COLLECTION",
        referenceNumber: collectionNumber,
        referenceId: (collection._id as any).toString(),
        moneyReceiptNumber: mrNo,
        date: collection.collectionDate,
        paymentDate: collection.depositDate || collection.collectionDate,
        description: `Payment / Collection M.R. #${mrNo} via ${paymentMethod} into ${account.name}`,
        debit: 0,
        credit: numAmount,
        runningBalance: newDealerBalance,
        isManual: false,
        createdBy: req.user?._id,
      });

      account.currentBalance += numAmount;
      await account.save();

      await LedgerEntry.create({
        entityType: "ACCOUNT",
        account: account._id,
        transactionType: "COLLECTION",
        referenceNumber: collectionNumber,
        referenceId: (collection._id as any).toString(),
        date: collection.depositDate || collection.collectionDate,
        description: `Payment received from ${dealer.businessName} (M.R. #${mrNo})`,
        debit: numAmount,
        credit: 0,
        runningBalance: account.currentBalance,
        createdBy: req.user?._id,
      });

      if (invoiceId) {
        const invoice = await Invoice.findById(invoiceId);
        if (invoice) {
          invoice.paidAmount += numAmount;
          invoice.dueAmount = Math.max(0, invoice.grandTotal - invoice.paidAmount);
          if (invoice.dueAmount === 0) invoice.paymentStatus = "PAID";
          else invoice.paymentStatus = "PARTIALLY_PAID";
          await invoice.save();
        }
      }
    }

    if (isSalesOfficer) {
      // Notify Admin of pending approval
      await createNotification({
        title: "New Collection Pending Approval",
        message: `Sales Officer ${req.user?.name} submitted collection of ৳${numAmount.toLocaleString()} from ${dealer.businessName} (M.R. #${moneyReceiptNumber || "N/A"}) deposited to ${account.name}.`,
        type: "PAYMENT_COLLECTED",
        link: "/collections",
        metadata: {
          collectionId: (collection._id as any).toString(),
          collectionNumber,
          amount: numAmount,
          dealerName: dealer.businessName,
          accountName: account.name,
          moneyReceiptNumber,
        },
      });
    }

    await logAuditEvent({
      userId: (req.user?._id as any)?.toString(),
      userName: req.user?.name,
      action: isSalesOfficer ? "SUBMIT_COLLECTION" : "RECORD_COLLECTION",
      entity: "Collection",
      entityId: (collection._id as any).toString(),
      details: `${isSalesOfficer ? "Submitted" : "Recorded"} collection ${collectionNumber} of ৳${numAmount} for dealer ${dealer.businessName}. Status: ${status}`,
    });

    const populated = await Collection.findById(collection._id)
      .populate("dealer", "dealerCode businessName proprietorName phone currentBalance")
      .populate("account", "name type accountNumber bankName")
      .populate("salesOfficer", "officerCode name")
      .populate("collectedBy", "name email");

    res.status(201).json(
      ApiResponse.success(
        populated,
        isSalesOfficer
          ? "Payment collection & bank deposit submitted successfully! Awaiting Admin approval."
          : "Collection recorded and financial accounts balanced successfully"
      )
    );
  } catch (error) {
    next(error);
  }
};

export const approveCollection = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const collection = await Collection.findById(id);
    if (!collection) throw new ApiError(404, "Collection record not found");

    if (collection.status === "Approved") {
      throw new ApiError(400, "Collection is already approved");
    }

    const dealer = await Dealer.findById(collection.dealer);
    if (!dealer) throw new ApiError(404, "Associated dealer not found");

    const account = await Account.findById(collection.account);
    if (!account) throw new ApiError(404, "Target bank/cash account not found");

    const amount = collection.amount;

    // Credit dealer ledger & update balance
    dealer.currentBalance -= amount;
    await dealer.save();

    const mrNo = collection.moneyReceiptNumber || collection.receiptNumber || collection.collectionNumber;

    await LedgerEntry.create({
      entityType: "DEALER",
      dealer: dealer._id,
      transactionType: "COLLECTION",
      referenceNumber: collection.collectionNumber,
      referenceId: (collection._id as any).toString(),
      moneyReceiptNumber: mrNo,
      date: collection.collectionDate || new Date(),
      paymentDate: collection.depositDate || collection.collectionDate || new Date(),
      description: `Payment / Collection M.R. #${mrNo} via ${collection.paymentMethod} deposited into ${account.name} (Slip: ${collection.depositSlipNumber || "N/A"})`,
      debit: 0,
      credit: amount,
      runningBalance: dealer.currentBalance,
      isManual: false,
      createdBy: req.user?._id,
    });

    // Credit company bank account balance
    account.currentBalance += amount;
    await account.save();

    await LedgerEntry.create({
      entityType: "ACCOUNT",
      account: account._id,
      transactionType: "COLLECTION",
      referenceNumber: collection.collectionNumber,
      referenceId: (collection._id as any).toString(),
      date: collection.depositDate || collection.collectionDate || new Date(),
      description: `Deposit approved from ${dealer.businessName} (M.R. #${mrNo}, Slip: ${collection.depositSlipNumber || "N/A"})`,
      debit: amount,
      credit: 0,
      runningBalance: account.currentBalance,
      createdBy: req.user?._id,
    });

    // If linked to invoice, update invoice
    if (collection.invoice) {
      const invoice = await Invoice.findById(collection.invoice);
      if (invoice) {
        invoice.paidAmount += amount;
        invoice.dueAmount = Math.max(0, invoice.grandTotal - invoice.paidAmount);
        if (invoice.dueAmount === 0) invoice.paymentStatus = "PAID";
        else invoice.paymentStatus = "PARTIALLY_PAID";
        await invoice.save();
      }
    }

    collection.status = "Approved";
    collection.approvedBy = req.user?._id as any;
    collection.approvalDate = new Date();
    await collection.save();

    // Create notification for the Sales Officer who submitted it
    await createNotification({
      title: "Collection Approved",
      message: `Collection #${collection.collectionNumber} for ৳${amount.toLocaleString()} from ${dealer.businessName} (M.R. #${mrNo}) has been approved and posted to the ledger.`,
      type: "PAYMENT_COLLECTED",
      link: "/collections",
      recipientRole: "SalesOfficer",
      metadata: {
        collectionNumber: collection.collectionNumber,
        amount,
        dealerName: dealer.businessName,
      },
    });

    await logAuditEvent({
      userId: (req.user?._id as any)?.toString(),
      userName: req.user?.name,
      action: "APPROVE_COLLECTION",
      entity: "Collection",
      entityId: (collection._id as any).toString(),
      details: `Approved collection ${collection.collectionNumber} of ৳${amount} for dealer ${dealer.businessName}. Posted to ledger and bank account ${account.name}.`,
    });

    const populated = await Collection.findById(collection._id)
      .populate("dealer", "dealerCode businessName proprietorName phone currentBalance")
      .populate("account", "name type accountNumber bankName")
      .populate("salesOfficer", "officerCode name")
      .populate("collectedBy", "name email")
      .populate("approvedBy", "name email");

    res.status(200).json(ApiResponse.success(populated, "Collection approved and posted to general ledger successfully"));
  } catch (error) {
    next(error);
  }
};

export const rejectCollection = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const collection = await Collection.findById(id);
    if (!collection) throw new ApiError(404, "Collection record not found");

    if (collection.status === "Approved") {
      throw new ApiError(400, "Cannot reject an already approved collection. Use reversal instead.");
    }

    collection.status = "Rejected";
    collection.rejectionReason = reason?.trim() || "Rejected by administrator";
    collection.approvedBy = req.user?._id as any;
    collection.approvalDate = new Date();
    await collection.save();

    const dealer = await Dealer.findById(collection.dealer);

    await createNotification({
      title: "Collection Rejected",
      message: `Collection #${collection.collectionNumber} for ৳${collection.amount.toLocaleString()} from ${dealer?.businessName || "Dealer"} was rejected. Reason: ${collection.rejectionReason}`,
      type: "GENERAL",
      link: "/collections",
      recipientRole: "SalesOfficer",
      metadata: {
        collectionNumber: collection.collectionNumber,
        amount: collection.amount,
        reason: collection.rejectionReason,
      },
    });

    await logAuditEvent({
      userId: (req.user?._id as any)?.toString(),
      userName: req.user?.name,
      action: "REJECT_COLLECTION",
      entity: "Collection",
      entityId: (collection._id as any).toString(),
      details: `Rejected collection ${collection.collectionNumber}. Reason: ${collection.rejectionReason}`,
    });

    const populated = await Collection.findById(collection._id)
      .populate("dealer", "dealerCode businessName proprietorName phone currentBalance")
      .populate("account", "name type accountNumber bankName")
      .populate("salesOfficer", "officerCode name")
      .populate("collectedBy", "name email")
      .populate("approvedBy", "name email");

    res.status(200).json(ApiResponse.success(populated, "Collection rejected"));
  } catch (error) {
    next(error);
  }
};

export const deleteCollection = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) throw new ApiError(404, "Collection record not found");

    const dealer = await Dealer.findById(collection.dealer);
    const account = await Account.findById(collection.account);

    // Reverse balances only if it was approved
    if (collection.status === "Approved") {
      if (dealer) {
        dealer.currentBalance += collection.amount; // Restoring dealer due
        await dealer.save();
      }

      if (account) {
        account.currentBalance = Math.max(0, account.currentBalance - collection.amount); // Reverting cash/bank balance
        await account.save();
      }

      await LedgerEntry.create({
        entityType: "DEALER",
        dealer: collection.dealer,
        transactionType: "ADJUSTMENT",
        referenceNumber: `REV-${collection.collectionNumber}`,
        date: new Date(),
        description: `Reversal / Void of collection ${collection.collectionNumber}`,
        debit: collection.amount,
        credit: 0,
        runningBalance: dealer?.currentBalance || 0,
        createdBy: req.user?._id,
      });
    }

    await Collection.findByIdAndDelete(collection._id);

    await logAuditEvent({
      userId: (req.user?._id as any)?.toString(),
      userName: req.user?.name,
      action: "VOID_COLLECTION",
      module: "FINANCE",
      targetId: collection.collectionNumber,
      details: { amount: collection.amount, dealerId: collection.dealer, status: collection.status },
      ipAddress: req.ip,
    });

    res.status(200).json(ApiResponse.success(null, "Collection deleted successfully"));
  } catch (error) {
    next(error);
  }
};

export const getExpenses = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const expenses = await Expense.find()
      .populate("category", "name")
      .populate("account", "name type")
      .populate("createdBy", "name")
      .sort({ expenseDate: -1 });
    res.status(200).json(ApiResponse.success(expenses));
  } catch (error) {
    next(error);
  }
};

export const recordExpense = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { categoryId, accountId, amount, payeeName, paymentMethod, referenceNumber, notes } = req.body;

    const account = await Account.findById(accountId);
    if (!account) throw new ApiError(404, "Payment account not found");

    const category = await ExpenseCategory.findById(categoryId);
    if (!category) throw new ApiError(404, "Expense category not found");

    const expenseNumber = await generateSequentialId("EXP", "expense");
    const expense = await Expense.create({
      expenseNumber,
      category: category._id,
      account: account._id,
      amount,
      payeeName,
      paymentMethod,
      referenceNumber,
      notes,
      createdBy: req.user?._id,
    });

    account.currentBalance -= amount;
    await account.save();

    await LedgerEntry.create({
      entityType: "ACCOUNT",
      account: account._id,
      transactionType: "EXPENSE",
      referenceNumber: expenseNumber,
      referenceId: (expense._id as any).toString(),
      date: expense.expenseDate,
      description: `Expense: ${category.name} - ${payeeName || notes || ""}`,
      debit: 0,
      credit: amount,
      runningBalance: account.currentBalance,
      createdBy: req.user?._id,
    });

    res.status(201).json(ApiResponse.success(expense, "Expense logged and balance deducted"));
  } catch (error) {
    next(error);
  }
};

export const getLedgerEntries = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filter: any = {};
    if (req.query.dealer) {
      filter.dealer = req.query.dealer;
      filter.entityType = "DEALER";
    }
    if (req.query.account) {
      filter.account = req.query.account;
      filter.entityType = "ACCOUNT";
    }

    const entries = await LedgerEntry.find(filter)
      .populate("dealer", "dealerCode businessName proprietorName phone address creditLimit currentBalance")
      .populate("account", "name type")
      .populate("createdBy", "name")
      .sort({ date: -1, createdAt: -1 })
      .limit(300);

    res.status(200).json(ApiResponse.success(entries));
  } catch (error) {
    next(error);
  }
};

// ================= DEALER GENERAL LEDGER (CUSTOMER LEDGER) =================

export const getDealersLedgerSummary = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dealers = await Dealer.find()
      .populate("territory", "name code region")
      .populate("assignedSalesOfficer", "name phone officerCode designation")
      .sort({ businessName: 1 });

    // Count ledger entries per dealer
    const stats = await LedgerEntry.aggregate([
      { $match: { entityType: "DEALER" } },
      {
        $group: {
          _id: "$dealer",
          entryCount: { $sum: 1 },
          lastEntryDate: { $max: "$date" },
          totalDebit: { $sum: "$debit" },
          totalCredit: { $sum: "$credit" },
          totalAdjustment: { $sum: "$adjustmentAmount" },
          totalReturn: { $sum: "$returnAmount" },
        },
      },
    ]);

    const statsMap = new Map();
    stats.forEach((s) => {
      if (s._id) statsMap.set(s._id.toString(), s);
    });

    const result = dealers.map((dealer) => {
      const dStat = statsMap.get(dealer._id.toString()) || {
        entryCount: 0,
        lastEntryDate: null,
        totalDebit: 0,
        totalCredit: 0,
        totalAdjustment: 0,
        totalReturn: 0,
      };

      return {
        _id: dealer._id,
        dealerCode: dealer.dealerCode,
        businessName: dealer.businessName,
        proprietorName: dealer.proprietorName,
        phone: dealer.phone,
        secondaryPhone: dealer.secondaryPhone,
        address: dealer.address,
        territory: dealer.territory,
        assignedSalesOfficer: dealer.assignedSalesOfficer,
        creditLimit: dealer.creditLimit || 0,
        monthlyCollectionPercentage: dealer.monthlyCollectionPercentage || 25,
        currentBalance: dealer.currentBalance || 0,
        openingBalance: dealer.openingBalance || 0,
        status: dealer.status,
        entryCount: dStat.entryCount,
        lastEntryDate: dStat.lastEntryDate,
        totalDebit: dStat.totalDebit || 0,
        totalCredit: dStat.totalCredit || 0,
        totalAdjustment: dStat.totalAdjustment || 0,
        totalReturn: dStat.totalReturn || 0,
      };
    });

    res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

export const getDealerLedger = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { dealerId } = req.params;
    const { startDate, endDate, period, year } = req.query;

    const dealer = await Dealer.findById(dealerId)
      .populate("territory", "name code region")
      .populate("assignedSalesOfficer", "name phone officerCode designation");

    if (!dealer) {
      throw new ApiError(404, "Dealer not found");
    }

    // Determine filter date boundaries
    let filterStart: Date | undefined;
    let filterEnd: Date | undefined;

    const queryYear = year ? Number(year) : new Date().getFullYear();

    if (period === "JAN_JUN") {
      filterStart = new Date(queryYear, 0, 1, 0, 0, 0, 0);
      filterEnd = new Date(queryYear, 5, 30, 23, 59, 59, 999);
    } else if (period === "JUL_DEC") {
      filterStart = new Date(queryYear, 6, 1, 0, 0, 0, 0);
      filterEnd = new Date(queryYear, 11, 31, 23, 59, 59, 999);
    } else if (startDate && endDate) {
      filterStart = new Date(startDate as string);
      filterEnd = new Date(new Date(endDate as string).setHours(23, 59, 59, 999));
    }

    // Calculate opening balance before filterStart if applicable
    let calculatedOpeningBalance = dealer.openingBalance || 0;

    if (filterStart) {
      const priorEntries = await LedgerEntry.find({
        entityType: "DEALER",
        dealer: dealer._id,
        date: { $lt: filterStart },
      });

      for (const entry of priorEntries) {
        const debit = Number(entry.debit) || 0;
        const credit = Number(entry.credit) || 0;
        const adj = Number(entry.adjustmentAmount) || 0;
        const ret = Number(entry.returnAmount) || 0;
        calculatedOpeningBalance += debit - credit - adj - ret;
      }
    }

    // Fetch entries in date range
    const entryFilter: any = {
      entityType: "DEALER",
      dealer: dealer._id,
    };

    if (filterStart || filterEnd) {
      entryFilter.date = {};
      if (filterStart) entryFilter.date.$gte = filterStart;
      if (filterEnd) entryFilter.date.$lte = filterEnd;
    }

    const entries = await LedgerEntry.find(entryFilter)
      .populate("createdBy", "name")
      .sort({ date: 1, createdAt: 1 });

    // Compute running balances chronologically
    let running = calculatedOpeningBalance;
    let totalInvoiced = 0;
    let totalCashInvoiced = 0;
    let totalPaid = 0;
    let totalBonus = 0;
    let totalAdjustment = 0;
    let totalReturn = 0;

    const computedEntries = entries.map((entry, index) => {
      const debit = Number(entry.debit) || 0;
      const credit = Number(entry.credit) || 0;
      const cashInv = Number(entry.cashInvoiceAmount) || 0;
      const bonus = Number(entry.bonusAmount) || Number(entry.adjustmentAmount) || 0;
      const adj = Number(entry.adjustmentAmount) || bonus;
      const ret = Number(entry.returnAmount) || 0;

      // Net impact on dealer due: debit adds due; credit, bonus/adjustment, and return reduce due
      running = running + debit - credit - bonus - ret;

      totalInvoiced += debit;
      totalCashInvoiced += cashInv;
      totalPaid += credit;
      totalBonus += bonus;
      totalAdjustment += adj;
      totalReturn += ret;

      return {
        _id: entry._id,
        slNo: index + 1,
        date: entry.date,
        invoiceNumber: entry.invoiceNumber || (debit > 0 ? entry.referenceNumber : ""),
        moneyReceiptNumber: entry.moneyReceiptNumber || (credit > 0 ? entry.referenceNumber : ""),
        referenceNumber: entry.referenceNumber,
        transactionType: entry.transactionType,
        description: entry.description,
        debit,
        cashInvoiceAmount: cashInv,
        credit,
        paymentDate: entry.paymentDate || (credit > 0 ? entry.date : null),
        bonusAmount: bonus,
        adjustmentAmount: adj,
        returnAmount: ret,
        netSales: debit > 0 ? Math.max(0, debit - ret) : 0,
        runningBalance: running,
        isManual: entry.isManual || false,
        notes: entry.notes || "",
        createdBy: entry.createdBy,
        createdAt: entry.createdAt,
      };
    });

    const netSales = Math.max(0, totalInvoiced - totalReturn);
    const closingBalance = running;

    res.status(200).json(
      ApiResponse.success({
        dealer,
        openingBalance: calculatedOpeningBalance,
        entries: computedEntries,
        summary: {
          openingBalance: calculatedOpeningBalance,
          totalInvoiced,
          totalCashInvoiced,
          totalPaid,
          totalBonus,
          totalAdjustment,
          totalReturn,
          netSales,
          closingBalance,
          creditLimit: dealer.creditLimit || 0,
          monthlyCollectionPercentage: dealer.monthlyCollectionPercentage || 25,
          currentDue: dealer.currentBalance || 0,
        },
      })
    );
  } catch (error) {
    next(error);
  }
};

export const addDealerLedgerEntry = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      dealerId,
      date,
      invoiceNumber,
      moneyReceiptNumber,
      transactionType,
      description,
      invoiceAmount,
      cashInvoiceAmount,
      paymentAmount,
      paymentDate,
      bonusAmount,
      adjustmentAmount,
      returnAmount,
      notes,
    } = req.body;

    if (!dealerId) {
      throw new ApiError(400, "Dealer ID is required");
    }

    const dealer = await Dealer.findById(dealerId);
    if (!dealer) {
      throw new ApiError(404, "Dealer not found");
    }

    const debit = Math.max(0, Number(invoiceAmount) || 0);
    const credit = Math.max(0, Number(paymentAmount) || 0);
    const cashInv = Math.max(0, Number(cashInvoiceAmount) || 0);
    const bonus = Math.max(0, Number(bonusAmount !== undefined ? bonusAmount : adjustmentAmount) || 0);
    const ret = Math.max(0, Number(returnAmount) || 0);

    if (debit === 0 && credit === 0 && bonus === 0 && ret === 0) {
      throw new ApiError(400, "Please provide at least one non-zero amount (Invoice, Payment, Bonus, or Return)");
    }

    // Determine sequential reference number if none supplied
    let refNo = invoiceNumber?.trim() || moneyReceiptNumber?.trim();
    if (!refNo) {
      refNo = await generateSequentialId("GL", "ledger");
    }

    // Net balance change
    const netChange = debit - credit - bonus - ret;
    dealer.currentBalance += netChange;
    await dealer.save();

    let autoTxType = transactionType;
    if (!autoTxType) {
      if (debit > 0) autoTxType = "INVOICE";
      else if (credit > 0) autoTxType = "COLLECTION";
      else if (bonus > 0) autoTxType = "ADJUSTMENT";
      else if (ret > 0) autoTxType = "SALES_RETURN";
      else autoTxType = "MANUAL_ENTRY";
    }

    const desc =
      description?.trim() ||
      (debit > 0
        ? `Sales Invoice #${refNo}`
        : credit > 0
        ? `Payment / Collection M.R. #${moneyReceiptNumber || refNo}`
        : bonus > 0
        ? `Bonus / Incentive #${refNo}`
        : `Product Return #${refNo}`);

    const entry = await LedgerEntry.create({
      entityType: "DEALER",
      dealer: dealer._id,
      transactionType: autoTxType,
      referenceNumber: refNo,
      invoiceNumber: invoiceNumber?.trim(),
      moneyReceiptNumber: moneyReceiptNumber?.trim(),
      date: date ? new Date(date) : new Date(),
      paymentDate: paymentDate ? new Date(paymentDate) : credit > 0 ? (date ? new Date(date) : new Date()) : undefined,
      description: desc,
      debit,
      credit,
      cashInvoiceAmount: cashInv,
      bonusAmount: bonus,
      adjustmentAmount: bonus,
      returnAmount: ret,
      runningBalance: dealer.currentBalance,
      isManual: true,
      notes: notes?.trim(),
      createdBy: req.user?._id,
    });

    await logAuditEvent({
      userId: (req.user?._id as any)?.toString(),
      userName: req.user?.name,
      action: "CREATE_DEALER_LEDGER_ENTRY",
      entity: "LedgerEntry",
      entityId: (entry._id as any).toString(),
      details: `Added General Ledger entry for dealer ${dealer.businessName}: Debit=${debit}, Credit=${credit}, Bonus=${bonus}, Ret=${ret}, NewBalance=${dealer.currentBalance}`,
    });

    res.status(201).json(ApiResponse.success(entry, "Customer ledger entry recorded successfully"));
  } catch (error) {
    next(error);
  }
};

export const updateDealerLedgerEntry = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      date,
      invoiceNumber,
      moneyReceiptNumber,
      transactionType,
      description,
      invoiceAmount,
      cashInvoiceAmount,
      paymentAmount,
      paymentDate,
      bonusAmount,
      adjustmentAmount,
      returnAmount,
      notes,
    } = req.body;

    const entry = await LedgerEntry.findById(id);
    if (!entry) {
      throw new ApiError(404, "Ledger entry not found");
    }

    if (entry.entityType !== "DEALER" || !entry.dealer) {
      throw new ApiError(400, "Only dealer ledger entries can be edited here");
    }

    const dealer = await Dealer.findById(entry.dealer);
    if (!dealer) {
      throw new ApiError(404, "Associated dealer not found");
    }

    // Revert previous balance impact
    const oldDebit = Number(entry.debit) || 0;
    const oldCredit = Number(entry.credit) || 0;
    const oldBonus = Number(entry.bonusAmount) || Number(entry.adjustmentAmount) || 0;
    const oldRet = Number(entry.returnAmount) || 0;
    const oldNetChange = oldDebit - oldCredit - oldBonus - oldRet;

    // Calculate new balance impact
    const newDebit = invoiceAmount !== undefined ? Math.max(0, Number(invoiceAmount) || 0) : oldDebit;
    const newCredit = paymentAmount !== undefined ? Math.max(0, Number(paymentAmount) || 0) : oldCredit;
    const newCashInv = cashInvoiceAmount !== undefined ? Math.max(0, Number(cashInvoiceAmount) || 0) : entry.cashInvoiceAmount || 0;
    const newBonus = bonusAmount !== undefined ? Math.max(0, Number(bonusAmount) || 0) : (adjustmentAmount !== undefined ? Math.max(0, Number(adjustmentAmount) || 0) : oldBonus);
    const newRet = returnAmount !== undefined ? Math.max(0, Number(returnAmount) || 0) : oldRet;
    const newNetChange = newDebit - newCredit - newBonus - newRet;

    dealer.currentBalance = dealer.currentBalance - oldNetChange + newNetChange;
    await dealer.save();

    if (date) entry.date = new Date(date);
    if (invoiceNumber !== undefined) entry.invoiceNumber = invoiceNumber.trim();
    if (moneyReceiptNumber !== undefined) entry.moneyReceiptNumber = moneyReceiptNumber.trim();
    if (transactionType) entry.transactionType = transactionType;
    if (description) entry.description = description.trim();
    if (notes !== undefined) entry.notes = notes.trim();
    if (paymentDate !== undefined) entry.paymentDate = paymentDate ? new Date(paymentDate) : undefined;

    entry.debit = newDebit;
    entry.credit = newCredit;
    entry.cashInvoiceAmount = newCashInv;
    entry.bonusAmount = newBonus;
    entry.adjustmentAmount = newBonus;
    entry.returnAmount = newRet;
    entry.runningBalance = dealer.currentBalance;

    await entry.save();

    await logAuditEvent({
      userId: (req.user?._id as any)?.toString(),
      userName: req.user?.name,
      action: "UPDATE_DEALER_LEDGER_ENTRY",
      entity: "LedgerEntry",
      entityId: (entry._id as any).toString(),
      details: `Updated General Ledger entry ${entry.referenceNumber} for ${dealer.businessName}`,
    });

    res.status(200).json(ApiResponse.success(entry, "Customer ledger entry updated successfully"));
  } catch (error) {
    next(error);
  }
};

export const deleteDealerLedgerEntry = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const entry = await LedgerEntry.findById(id);
    if (!entry) {
      throw new ApiError(404, "Ledger entry not found");
    }

    if (entry.entityType !== "DEALER" || !entry.dealer) {
      throw new ApiError(400, "Only dealer ledger entries can be deleted here");
    }

    const dealer = await Dealer.findById(entry.dealer);
    if (dealer) {
      const debit = Number(entry.debit) || 0;
      const credit = Number(entry.credit) || 0;
      const bonus = Number(entry.bonusAmount) || Number(entry.adjustmentAmount) || 0;
      const ret = Number(entry.returnAmount) || 0;
      const netChange = debit - credit - bonus - ret;

      // Reverse balance
      dealer.currentBalance -= netChange;
      await dealer.save();
    }

    await LedgerEntry.findByIdAndDelete(entry._id);

    await logAuditEvent({
      userId: (req.user?._id as any)?.toString(),
      userName: req.user?.name,
      action: "DELETE_DEALER_LEDGER_ENTRY",
      entity: "LedgerEntry",
      entityId: (entry._id as any).toString(),
      details: `Deleted General Ledger entry ${entry.referenceNumber}`,
    });

    res.status(200).json(ApiResponse.success(null, "Customer ledger entry deleted and dealer balance reversed"));
  } catch (error) {
    next(error);
  }
};

// ================= SALES OFFICER DEALER LEDGER (IMAGE 2) =================

export const getSalesOfficersList = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filter: any = { isActive: true };
    if (req.user?.role === "SalesOfficer" && req.user.salesOfficerProfile) {
      filter._id = req.user.salesOfficerProfile;
    }
    const officers = await SalesOfficer.find(filter)
      .populate("territory", "name code region")
      .sort({ name: 1 });
    res.status(200).json(ApiResponse.success(officers));
  } catch (error) {
    next(error);
  }
};

export const getSalesOfficerLedger = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { officerId } = req.params;

    // Isolation check: if user is SalesOfficer, they can only view their own officer ledger
    if (req.user?.role === "SalesOfficer") {
      const myOfficerId = req.user.salesOfficerProfile?.toString();
      if (myOfficerId && myOfficerId !== officerId) {
        throw new ApiError(403, "Access Denied: You can only view your own Sales Officer Dealer Ledger");
      }
    }

    const officer = await SalesOfficer.findById(officerId).populate("territory", "name code region");
    if (!officer) {
      throw new ApiError(404, "Sales Officer not found");
    }

    // Find all dealers assigned to this sales officer
    const dealers = await Dealer.find({ assignedSalesOfficer: officer._id })
      .populate("territory", "name code region")
      .sort({ dealerCode: 1, businessName: 1 });

    const dealerIds = dealers.map((d) => d._id);
    const entries = await LedgerEntry.find({
      entityType: "DEALER",
      dealer: { $in: dealerIds },
    });

    // Group entries by dealer
    const dealerEntriesMap = new Map<string, any[]>();
    for (const entry of entries) {
      const dId = entry.dealer ? entry.dealer.toString() : "";
      if (dId) {
        if (!dealerEntriesMap.has(dId)) {
          dealerEntriesMap.set(dId, []);
        }
        dealerEntriesMap.get(dId)!.push(entry);
      }
    }

    let sumTotalInv = 0;
    let sumReturn = 0;
    let sumNetSales = 0;
    let sumPayment = 0;
    let sumBonus = 0;
    let sumBalance = 0;
    let sumOverDues = 0;
    let sumGrandTotal = 0;

    const rows = dealers.map((dealer) => {
      const dEntries = dealerEntriesMap.get(dealer._id.toString()) || [];

      let totalInvAmoTk = 0;
      let returnAmount = 0;
      let payment = 0;
      let bonus = 0;

      for (const e of dEntries) {
        totalInvAmoTk += Number(e.debit) || 0;
        returnAmount += Number(e.returnAmount) || 0;
        payment += Number(e.credit) || 0;
        bonus += (Number(e.bonusAmount) || 0) + (Number(e.adjustmentAmount) || 0);
      }

      const netSales = Math.max(0, totalInvAmoTk - returnAmount);
      const balance = netSales - payment - bonus;
      const overDues = Number(dealer.openingBalance) || 0;
      const grandTotal = balance + overDues;

      sumTotalInv += totalInvAmoTk;
      sumReturn += returnAmount;
      sumNetSales += netSales;
      sumPayment += payment;
      sumBonus += bonus;
      sumBalance += balance;
      sumOverDues += overDues;
      sumGrandTotal += grandTotal;

      return {
        _id: dealer._id,
        code: dealer.dealerCode,
        customerName: dealer.businessName,
        proprietorName: dealer.proprietorName,
        address: dealer.address,
        phone: dealer.phone,
        totalInvAmoTk,
        returnAmount,
        netSales,
        payment,
        bonus,
        balance,
        overDues,
        grandTotal,
      };
    });

    res.status(200).json(
      ApiResponse.success({
        officer: {
          _id: officer._id,
          name: officer.name,
          officerCode: officer.officerCode,
          phone: officer.phone,
          territory: (officer.territory as any)?.name || "N/A",
          region: (officer.territory as any)?.region || "N/A",
        },
        rows,
        totals: {
          totalInvAmoTk: sumTotalInv,
          returnAmount: sumReturn,
          netSales: sumNetSales,
          payment: sumPayment,
          bonus: sumBonus,
          balance: sumBalance,
          overDues: sumOverDues,
          grandTotal: sumGrandTotal,
        },
      })
    );
  } catch (error) {
    next(error);
  }
};

