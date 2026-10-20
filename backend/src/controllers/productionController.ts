import { Response, NextFunction } from "express";
import { AuthRequest } from "../middlewares/auth.js";
import { BOM, ProductionOrder } from "../models/Production.js";
import { Product } from "../models/Product.js";
import { Warehouse } from "../models/WarehouseAndSupplier.js";
import { InventoryBalance, StockMovement } from "../models/Inventory.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { generateSequentialId } from "../utils/idGenerator.js";
import { logAuditEvent } from "../utils/auditLogger.js";

export const getBOMs = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const boms = await BOM.find()
      .populate("product", "productCode name packSize tradePrice")
      .populate({
        path: "items.rawMaterial",
        select: "materialCode name category unit averageCost",
        populate: { path: "unit", select: "name symbol" },
      });
    res.status(200).json(ApiResponse.success(boms));
  } catch (error) {
    next(error);
  }
};

export const createBOM = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { productId, name, version = "1.0", items, notes } = req.body;
    if (!productId || !items || !Array.isArray(items) || items.length === 0) {
      throw new ApiError(400, "Please provide product and BOM raw material recipe items");
    }

    const bom = await BOM.create({
      product: productId,
      name,
      version,
      items,
      notes,
    });

    res.status(201).json(ApiResponse.success(bom, "BOM recipe saved successfully"));
  } catch (error) {
    next(error);
  }
};

export const getProductionOrders = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const orders = await ProductionOrder.find()
      .populate("product", "productCode name packSize tradePrice")
      .populate("sourceWarehouse", "code name")
      .populate("destinationWarehouse", "code name")
      .populate("supervisor", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(ApiResponse.success(orders));
  } catch (error) {
    next(error);
  }
};

export const createProductionOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { productId, targetQuantity, batchNumber, sourceWarehouseId, destinationWarehouseId, notes } =
      req.body;

    if (!productId || !targetQuantity || !batchNumber || !sourceWarehouseId || !destinationWarehouseId) {
      throw new ApiError(400, "Missing required production order fields");
    }

    const orderNumber = await generateSequentialId("PRD", "production_order");
    const order = await ProductionOrder.create({
      orderNumber,
      product: productId,
      targetQuantity,
      batchNumber,
      sourceWarehouse: sourceWarehouseId,
      destinationWarehouse: destinationWarehouseId,
      status: "PLANNED",
      notes,
      supervisor: req.user?._id,
    });

    res.status(201).json(ApiResponse.success(order, "Production batch scheduled successfully"));
  } catch (error) {
    next(error);
  }
};

export const completeProductionOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { producedQuantity, wastageQuantity = 0, totalProductionCost = 0 } = req.body;
    const order = await ProductionOrder.findById(req.params.id);

    if (!order) throw new ApiError(404, "Production order not found");
    if (order.status === "COMPLETED") throw new ApiError(400, "Production order is already completed");

    // Add finished goods to destination warehouse
    await InventoryBalance.findOneAndUpdate(
      {
        warehouse: order.destinationWarehouse,
        itemType: "FinishedGood",
        product: order.product,
      },
      {
        $inc: {
          quantityOnHand: producedQuantity,
          availableQuantity: producedQuantity,
        },
      },
      { upsert: true }
    );

    const mvtNum = await generateSequentialId("SM", "stock_movement");
    await StockMovement.create({
      movementNumber: mvtNum,
      type: "PRODUCTION_OUTPUT",
      itemType: "FinishedGood",
      product: order.product,
      destinationWarehouse: order.destinationWarehouse,
      quantity: producedQuantity,
      referenceType: "ProductionOrder",
      referenceId: order.orderNumber,
      remarks: `Production output batch ${order.batchNumber}`,
      performedBy: req.user?._id,
    });

    order.status = "COMPLETED";
    order.producedQuantity = producedQuantity;
    order.wastageQuantity = wastageQuantity;
    order.totalProductionCost = totalProductionCost;
    order.perUnitCost = producedQuantity > 0 ? totalProductionCost / producedQuantity : 0;
    order.completionDate = new Date();
    await order.save();

    res.status(200).json(ApiResponse.success(order, "Production finished and stock credited to warehouse"));
  } catch (error) {
    next(error);
  }
};
