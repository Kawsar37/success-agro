import { Response, NextFunction } from "express";
import { AuthRequest } from "../middlewares/auth.js";
import { Invoice } from "../models/Invoice.js";
import { SalesOrder } from "../models/SalesOrder.js";
import { Dealer } from "../models/Dealer.js";
import { Product } from "../models/Product.js";
import { Warehouse } from "../models/WarehouseAndSupplier.js";
import { InventoryBalance, StockMovement } from "../models/Inventory.js";
import { LedgerEntry } from "../models/LedgerEntry.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { generateSequentialId } from "../utils/idGenerator.js";
import { logAuditEvent } from "../utils/auditLogger.js";
import { createNotification } from "../models/Notification.js";

export const getInvoices = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filter: any = {};
    if (req.user?.role === "SalesOfficer") {
      filter.salesOfficer = req.user.salesOfficerProfile;
    }
    if (req.query.dealer) {
      filter.dealer = req.query.dealer;
    }
    if (req.query.paymentStatus) {
      filter.paymentStatus = req.query.paymentStatus;
    }

    const invoices = await Invoice.find(filter)
      .populate("dealer", "dealerCode businessName proprietorName phone currentBalance creditLimit")
      .populate("warehouse", "code name")
      .populate("salesOfficer", "officerCode name")
      .populate("items.product", "productCode name packSize tradePrice")
      .sort({ createdAt: -1 });

    res.status(200).json(ApiResponse.success(invoices));
  } catch (error) {
    next(error);
  }
};

export const getInvoiceById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("dealer")
      .populate("warehouse")
      .populate("salesOfficer")
      .populate("items.product")
      .populate("createdBy", "name email");

    if (!invoice) {
      throw new ApiError(404, "Invoice not found");
    }

    if (
      req.user?.role === "SalesOfficer" &&
      String(invoice.salesOfficer?._id || invoice.salesOfficer) !== String(req.user.salesOfficerProfile)
    ) {
      throw new ApiError(403, "Access forbidden to this invoice");
    }

    res.status(200).json(ApiResponse.success(invoice));
  } catch (error) {
    next(error);
  }
};

export const createInvoice = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      dealerId,
      warehouseId,
      salesOrderId,
      items,
      discountAmount = 0,
      transportCharge = 0,
      otherCharges = 0,
      notes,
      dueDate,
    } = req.body;

    const dealer = await Dealer.findById(dealerId);
    if (!dealer) throw new ApiError(404, "Dealer not found");

    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) throw new ApiError(404, "Warehouse not found");

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new ApiError(400, "Please provide invoice items");
    }

    // Check inventory stock availability
    for (const item of items) {
      const balance = await InventoryBalance.findOne({
        warehouse: warehouse._id,
        itemType: "FinishedGood",
        product: item.productId || item.product,
      });

      const currentQty = balance ? balance.quantityOnHand : 0;
      if (currentQty < item.quantity) {
        const prod = await Product.findById(item.productId || item.product);
        throw new ApiError(
          400,
          `Insufficient stock in ${warehouse.name} for ${prod?.name || "product"}. Available: ${currentQty}, Requested: ${item.quantity}`
        );
      }
    }

    let subtotal = 0;
    const resolvedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId || item.product);
      if (!product) throw new ApiError(404, "Product not found");
      const unitPrice = item.unitPrice ?? product.tradePrice;
      const totalAmount = unitPrice * item.quantity;
      subtotal += totalAmount;

      resolvedItems.push({
        product: product._id,
        quantity: item.quantity,
        unitPrice,
        totalAmount,
      });
    }

    const grandTotal = Math.max(0, subtotal - discountAmount + transportCharge + otherCharges);
    const invoiceNumber = await generateSequentialId("INV", "invoice");

    const invoice = await Invoice.create({
      invoiceNumber,
      salesOrder: salesOrderId,
      dealer: dealer._id,
      salesOfficer: dealer.assignedSalesOfficer,
      warehouse: warehouse._id,
      items: resolvedItems,
      subtotal,
      discountAmount,
      transportCharge,
      otherCharges,
      grandTotal,
      paidAmount: 0,
      dueAmount: grandTotal,
      paymentStatus: "UNPAID",
      dueDate: dueDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days credit by default
      notes,
      createdBy: req.user?._id,
    });

    // Deduct inventory & record stock movements
    for (const item of resolvedItems) {
      await InventoryBalance.findOneAndUpdate(
        {
          warehouse: warehouse._id,
          itemType: "FinishedGood",
          product: item.product,
        },
        {
          $inc: {
            quantityOnHand: -item.quantity,
            availableQuantity: -item.quantity,
          },
        },
        { upsert: true }
      );

      const mvtNum = await generateSequentialId("SM", "stock_movement");
      await StockMovement.create({
        movementNumber: mvtNum,
        type: "SALES_DISPATCH",
        itemType: "FinishedGood",
        product: item.product,
        sourceWarehouse: warehouse._id,
        quantity: item.quantity,
        referenceType: "SalesInvoice",
        referenceId: invoice.invoiceNumber,
        remarks: `Dispatched against ${invoice.invoiceNumber} to ${dealer.businessName}`,
        performedBy: req.user?._id,
      });
    }

    // Update dealer balance & record ledger entry (debit dealer)
    const newDealerBalance = dealer.currentBalance + grandTotal;
    dealer.currentBalance = newDealerBalance;
    await dealer.save();

    await LedgerEntry.create({
      entityType: "DEALER",
      dealer: dealer._id,
      transactionType: "INVOICE",
      referenceNumber: invoice.invoiceNumber,
      referenceId: (invoice._id as any).toString(),
      date: invoice.invoiceDate,
      description: `Sales Invoice #${invoice.invoiceNumber} (${warehouse.name})`,
      debit: grandTotal,
      credit: 0,
      runningBalance: newDealerBalance,
      createdBy: req.user?._id,
    });

    // Mark sales order as CONVERTED if linked
    if (salesOrderId) {
      await SalesOrder.findByIdAndUpdate(salesOrderId, { status: "CONVERTED" });
    }

    await logAuditEvent({
      userId: (req.user?._id as any)?.toString(),
      userName: req.user?.name,
      action: "CREATE_INVOICE",
      module: "INVOICES",
      targetId: invoice.invoiceNumber,
      details: { grandTotal, dealer: dealer.businessName },
      ipAddress: req.ip,
    });

    await createNotification({
      title: "Invoice Dispatched from Depot",
      message: `Invoice #${invoice.invoiceNumber} generated for ${dealer.businessName} (৳${grandTotal.toLocaleString()}).`,
      type: "GENERAL",
      link: "/invoices",
      metadata: { invoiceId: invoice._id, invoiceNumber: invoice.invoiceNumber, amount: grandTotal },
    });

    res.status(201).json(ApiResponse.success(invoice, "Invoice created and inventory dispatched successfully"));
  } catch (error) {
    next(error);
  }
};

export const updateDeliveryStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status } = req.body;
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) throw new ApiError(404, "Invoice not found");

    invoice.deliveryStatus = status;
    if (status === "Delivered") {
      invoice.deliveryDate = new Date();
    }
    if (req.user?.role === "DeliveryMan") {
      invoice.deliveryMan = req.user._id as any;
    }
    await invoice.save();

    const isDelivered = status === "Delivered";
    const notifType = isDelivered ? "DELIVERY_COMPLETED" : "DELIVERY_PICKED_UP";
    const notifTitle = isDelivered ? "Delivery Completed" : "Order Picked Up for Delivery";
    const dealerDoc = await Dealer.findById(invoice.dealer);
    const dealerName = dealerDoc?.businessName || "Dealer";
    const performer = req.user?.name || "Delivery Personnel";

    await createNotification({
      title: notifTitle,
      message: `${performer} ${isDelivered ? "delivered" : "picked up & dispatched"} Invoice #${invoice.invoiceNumber} for ${dealerName}.`,
      type: notifType,
      link: "/invoices",
      metadata: {
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        status,
        dealerName,
      },
    });

    res.status(200).json(ApiResponse.success(invoice, `Delivery status updated to ${status}`));
  } catch (error) {
    next(error);
  }
};
