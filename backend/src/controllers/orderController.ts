import { Response, NextFunction } from "express";
import { AuthRequest } from "../middlewares/auth.js";
import { SalesOrder } from "../models/SalesOrder.js";
import { Dealer } from "../models/Dealer.js";
import { Product } from "../models/Product.js";
import { LedgerEntry } from "../models/LedgerEntry.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { generateSequentialId } from "../utils/idGenerator.js";
import { logAuditEvent } from "../utils/auditLogger.js";
import { createNotification } from "../models/Notification.js";

export const getOrders = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filter: any = {};

    // Strict Sales Officer isolation: Sales officers can ONLY see their assigned orders
    if (req.user?.role === "SalesOfficer") {
      filter.salesOfficer = req.user.salesOfficerProfile;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.dealer) {
      filter.dealer = req.query.dealer;
    }

    const orders = await SalesOrder.find(filter)
      .populate("dealer", "dealerCode businessName proprietorName phone creditLimit currentBalance")
      .populate("salesOfficer", "officerCode name phone")
      .populate("items.product", "productCode name packSize tradePrice")
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(ApiResponse.success(orders));
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const order = await SalesOrder.findById(req.params.id)
      .populate("dealer")
      .populate("salesOfficer")
      .populate("items.product")
      .populate("approvedBy", "name email");

    if (!order) {
      throw new ApiError(404, "Sales order not found");
    }

    // Isolation check
    if (
      req.user?.role === "SalesOfficer" &&
      String(order.salesOfficer?._id || order.salesOfficer) !== String(req.user.salesOfficerProfile)
    ) {
      throw new ApiError(403, "Access forbidden: You cannot view orders assigned to other sales officers");
    }

    res.status(200).json(ApiResponse.success(order));
  } catch (error) {
    next(error);
  }
};

export const createOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { dealerId, items, deliveryAddress, notes, discountAmount = 0 } = req.body;

    if (!dealerId || !items || !Array.isArray(items) || items.length === 0) {
      throw new ApiError(400, "Please provide dealerId and at least one order line item");
    }

    const dealer = await Dealer.findById(dealerId);
    if (!dealer) {
      throw new ApiError(404, "Dealer not found");
    }

    let salesOfficerId = req.body.salesOfficerId;
    if (req.user?.role === "SalesOfficer") {
      salesOfficerId = req.user.salesOfficerProfile;
    } else if (!salesOfficerId) {
      salesOfficerId = dealer.assignedSalesOfficer;
    }

    const isSalesOfficer = req.user?.role === "SalesOfficer";
    // Sales officers cannot apply custom discounts; only Admin can set discounts
    const effectiveDiscount = isSalesOfficer ? 0 : Math.max(0, Number(discountAmount) || 0);

    let subtotal = 0;
    const resolvedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId || item.product);
      if (!product) {
        throw new ApiError(404, `Product not found: ${item.productId || item.product}`);
      }

      // Sales Officer can only book at Admin-set trade price. They cannot modify prices.
      const unitPrice = isSalesOfficer ? product.tradePrice : (Number(item.unitPrice) ?? product.tradePrice);
      const quantity = Math.max(1, Number(item.quantity) || 1);
      const totalAmount = unitPrice * quantity;
      subtotal += totalAmount;

      resolvedItems.push({
        product: product._id,
        quantity,
        unitPrice,
        totalAmount,
        notes: item.notes,
      });
    }

    const grandTotal = Math.max(0, subtotal - effectiveDiscount);
    const orderNumber = await generateSequentialId("SO", "sales_order");

    const newOrder = await SalesOrder.create({
      orderNumber,
      dealer: dealer._id,
      salesOfficer: salesOfficerId,
      items: resolvedItems,
      subtotal,
      discountAmount: effectiveDiscount,
      totalAmount: grandTotal,
      status: "PENDING",
      deliveryAddress: deliveryAddress || dealer.address,
      notes,
      createdBy: req.user?._id,
    });

    await logAuditEvent({
      userId: (req.user?._id as any)?.toString(),
      userName: req.user?.name,
      action: "CREATE_SALES_ORDER",
      module: "ORDERS",
      targetId: newOrder.orderNumber,
      details: { totalAmount: grandTotal, dealer: dealer.businessName },
      ipAddress: req.ip,
    });

    await createNotification({
      title: "New Sales Order Placed",
      message: `${req.user?.name || "Sales Officer"} booked Order #${newOrder.orderNumber} for ${dealer.businessName} (৳${grandTotal.toLocaleString()}).`,
      type: "ORDER_CREATED",
      link: "/orders",
      metadata: { orderId: newOrder._id, orderNumber: newOrder.orderNumber, dealerName: dealer.businessName, amount: grandTotal },
    });

    const populatedOrder = await SalesOrder.findById(newOrder._id)
      .populate("dealer")
      .populate("salesOfficer")
      .populate("items.product");

    res.status(201).json(ApiResponse.success(populatedOrder, "Sales order submitted successfully"));
  } catch (error) {
    next(error);
  }
};

export const updateOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const order = await SalesOrder.findById(req.params.id);
    if (!order) {
      throw new ApiError(404, "Sales order not found");
    }

    if (order.status === "APPROVED") {
      throw new ApiError(400, "Cannot edit an order that has already been approved.");
    }

    const { items, discountAmount } = req.body;

    if (items && Array.isArray(items)) {
      let subtotal = 0;
      const resolvedItems = [];

      for (const item of items) {
        const product = await Product.findById(item.productId || item.product?._id || item.product);
        if (!product) {
          throw new ApiError(404, `Product not found: ${item.productId || item.product}`);
        }

        const unitPrice = Number(item.unitPrice) ?? product.tradePrice;
        const quantity = Math.max(1, Number(item.quantity) || 1);
        const totalAmount = unitPrice * quantity;
        subtotal += totalAmount;

        resolvedItems.push({
          product: product._id,
          quantity,
          unitPrice,
          totalAmount,
          notes: item.notes,
        });
      }

      order.items = resolvedItems as any;
      order.subtotal = subtotal;
      const effectiveDiscount = discountAmount !== undefined ? Math.max(0, Number(discountAmount) || 0) : order.discountAmount;
      order.discountAmount = effectiveDiscount;
      order.totalAmount = Math.max(0, subtotal - effectiveDiscount);
    }

    await order.save();

    const populated = await SalesOrder.findById(order._id)
      .populate("dealer")
      .populate("salesOfficer")
      .populate("items.product");

    res.status(200).json(ApiResponse.success(populated, "Order updated successfully"));
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, rejectionReason, items, discountAmount } = req.body;
    const order = await SalesOrder.findById(req.params.id);

    if (!order) {
      throw new ApiError(404, "Sales order not found");
    }

    if (order.status === "CONVERTED") {
      throw new ApiError(400, "Cannot change status of an order that has already been converted to an invoice.");
    }

    if (!["APPROVED", "REJECTED", "CANCELLED"].includes(status)) {
      throw new ApiError(400, "Invalid status transition");
    }

    const wasPending = order.status === "PENDING";
    const wasApproved = order.status === "APPROVED";

    // Revert ledger balance if already approved and now being cancelled/rejected
    if (wasApproved && (status === "CANCELLED" || status === "REJECTED")) {
      const dealer = await Dealer.findById(order.dealer);
      if (dealer) {
        dealer.currentBalance = Math.max(0, dealer.currentBalance - order.totalAmount);
        await dealer.save();

        await LedgerEntry.create({
          entityType: "DEALER",
          dealer: dealer._id,
          transactionType: "ADJUSTMENT",
          referenceNumber: `${order.orderNumber}-CANCEL`,
          invoiceNumber: order.orderNumber,
          referenceId: (order._id as any).toString(),
          date: new Date(),
          description: `Sales Order #${order.orderNumber} ${status === "CANCELLED" ? "Cancelled" : "Rejected"} (Reversal)`,
          debit: 0,
          credit: order.totalAmount,
          runningBalance: dealer.currentBalance,
          isManual: false,
          createdBy: req.user?._id,
        });
      }
    }

    // If admin edited items right before or during approval:
    if (items && Array.isArray(items) && wasPending) {
      let subtotal = 0;
      const resolvedItems = [];

      for (const item of items) {
        const product = await Product.findById(item.productId || item.product?._id || item.product);
        if (product) {
          const unitPrice = Number(item.unitPrice) ?? product.tradePrice;
          const quantity = Math.max(1, Number(item.quantity) || 1);
          const totalAmount = unitPrice * quantity;
          subtotal += totalAmount;

          resolvedItems.push({
            product: product._id,
            quantity,
            unitPrice,
            totalAmount,
            notes: item.notes,
          });
        }
      }

      if (resolvedItems.length > 0) {
        order.items = resolvedItems as any;
        order.subtotal = subtotal;
        const effectiveDiscount = discountAmount !== undefined ? Math.max(0, Number(discountAmount) || 0) : order.discountAmount;
        order.discountAmount = effectiveDiscount;
        order.totalAmount = Math.max(0, subtotal - effectiveDiscount);
      }
    }

    order.status = status;
    if (status === "APPROVED") {
      order.approvedBy = req.user?._id as any;
      order.approvedAt = new Date();

      // Automatically post to Dealer Customer Ledger!
      if (wasPending) {
        const dealer = await Dealer.findById(order.dealer);
        if (dealer) {
          // Check if already posted
          const existingLedger = await LedgerEntry.findOne({
            entityType: "DEALER",
            dealer: dealer._id,
            referenceNumber: order.orderNumber,
          });

          if (!existingLedger) {
            dealer.currentBalance += order.totalAmount;
            await dealer.save();

            const totalQuantity = order.items.reduce(
              (sum: number, it: any) => sum + (Number(it.quantity) || 0),
              0
            );

            await LedgerEntry.create({
              entityType: "DEALER",
              dealer: dealer._id,
              transactionType: "INVOICE",
              referenceNumber: order.orderNumber,
              invoiceNumber: order.orderNumber,
              referenceId: (order._id as any).toString(),
              date: order.orderDate || new Date(),
              description: `Sales Order #${order.orderNumber} Approved (${totalQuantity} pcs, ${order.items.length} product${order.items.length > 1 ? "s" : ""})`,
              debit: order.totalAmount,
              credit: 0,
              runningBalance: dealer.currentBalance,
              isManual: false,
              createdBy: req.user?._id,
            });
          }
        }
      }
    } else if (status === "REJECTED" || status === "CANCELLED") {
      order.rejectionReason = rejectionReason || (status === "CANCELLED" ? "Cancelled by admin" : "Rejected by administration");
    }

    await order.save();

    await logAuditEvent({
      userId: (req.user?._id as any)?.toString(),
      userName: req.user?.name,
      action: `ORDER_${status}`,
      module: "ORDERS",
      targetId: order.orderNumber,
      ipAddress: req.ip,
    });

    await createNotification({
      title: `Order #${order.orderNumber} ${status}`,
      message: `Order #${order.orderNumber} was marked as ${status} by ${req.user?.name || "Admin"}.`,
      type: "ORDER_STATUS_CHANGED",
      link: "/orders",
      metadata: { orderId: order._id, orderNumber: order.orderNumber, status },
    });

    const populated = await SalesOrder.findById(order._id)
      .populate("dealer")
      .populate("salesOfficer")
      .populate("items.product")
      .populate("approvedBy", "name email");

    res.status(200).json(ApiResponse.success(populated, `Sales order status changed to ${status}`));
  } catch (error) {
    next(error);
  }
};

export const cancelOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const order = await SalesOrder.findById(req.params.id);
    if (!order) {
      throw new ApiError(404, "Sales order not found");
    }

    if (order.status === "CONVERTED") {
      throw new ApiError(400, "Cannot cancel an order that has already been converted to an invoice.");
    }

    if (order.status === "CANCELLED") {
      throw new ApiError(400, "Sales order is already cancelled.");
    }

    const wasApproved = order.status === "APPROVED";
    if (wasApproved) {
      const dealer = await Dealer.findById(order.dealer);
      if (dealer) {
        dealer.currentBalance = Math.max(0, dealer.currentBalance - order.totalAmount);
        await dealer.save();

        await LedgerEntry.create({
          entityType: "DEALER",
          dealer: dealer._id,
          transactionType: "ADJUSTMENT",
          referenceNumber: `${order.orderNumber}-CANCEL`,
          invoiceNumber: order.orderNumber,
          referenceId: (order._id as any).toString(),
          date: new Date(),
          description: `Sales Order #${order.orderNumber} Cancelled (Reversal)`,
          debit: 0,
          credit: order.totalAmount,
          runningBalance: dealer.currentBalance,
          isManual: false,
          createdBy: req.user?._id,
        });
      }
    }

    order.status = "CANCELLED";
    order.rejectionReason = req.body.reason || "Cancelled by admin";
    await order.save();

    await logAuditEvent({
      userId: (req.user?._id as any)?.toString(),
      userName: req.user?.name,
      action: "ORDER_CANCELLED",
      module: "ORDERS",
      targetId: order.orderNumber,
      ipAddress: req.ip,
    });

    await createNotification({
      title: `Order #${order.orderNumber} Cancelled`,
      message: `Order #${order.orderNumber} was cancelled by ${req.user?.name || "Admin"}.`,
      type: "ORDER_STATUS_CHANGED",
      link: "/orders",
      metadata: { orderId: order._id, orderNumber: order.orderNumber, status: "CANCELLED" },
    });

    const populated = await SalesOrder.findById(order._id)
      .populate("dealer")
      .populate("salesOfficer")
      .populate("items.product")
      .populate("approvedBy", "name email");

    res.status(200).json(ApiResponse.success(populated, "Sales order cancelled successfully"));
  } catch (error) {
    next(error);
  }
};
