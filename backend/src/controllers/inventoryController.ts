import { Response, NextFunction } from "express";
import { AuthRequest } from "../middlewares/auth.js";
import { RawMaterial, InventoryBalance, StockMovement } from "../models/Inventory.js";
import { Product } from "../models/Product.js";
import { Warehouse } from "../models/WarehouseAndSupplier.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { generateSequentialId } from "../utils/idGenerator.js";
import { logAuditEvent } from "../utils/auditLogger.js";

export const getInventoryBalances = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filter: any = {};
    if (req.query.warehouse) filter.warehouse = req.query.warehouse;
    if (req.query.itemType) filter.itemType = req.query.itemType;

    const balances = await InventoryBalance.find(filter)
      .populate("warehouse", "code name location type")
      .populate({
        path: "product",
        select: "productCode name packSize tradePrice minimumStockAlert",
        populate: [
          { path: "category", select: "name" },
          { path: "unit", select: "name symbol" },
        ],
      })
      .populate({
        path: "rawMaterial",
        select: "materialCode name category minimumStockAlert averageCost",
        populate: { path: "unit", select: "name symbol" },
      })
      .sort({ updatedAt: -1 });

    res.status(200).json(ApiResponse.success(balances));
  } catch (error) {
    next(error);
  }
};

export const getStockMovements = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filter: any = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.itemType) filter.itemType = req.query.itemType;

    const movements = await StockMovement.find(filter)
      .populate("product", "productCode name packSize")
      .populate("rawMaterial", "materialCode name")
      .populate("sourceWarehouse", "code name")
      .populate("destinationWarehouse", "code name")
      .populate("performedBy", "name")
      .sort({ createdAt: -1 })
      .limit(200);

    res.status(200).json(ApiResponse.success(movements));
  } catch (error) {
    next(error);
  }
};

export const recordStockAdjustment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { warehouseId, itemType, itemId, adjustedQuantity, reason } = req.body;

    if (!warehouseId || !itemType || !itemId || adjustedQuantity === undefined) {
      throw new ApiError(400, "Missing required stock adjustment fields");
    }

    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) throw new ApiError(404, "Warehouse not found");

    const query: any = { warehouse: warehouse._id, itemType };
    if (itemType === "FinishedGood") query.product = itemId;
    else query.rawMaterial = itemId;

    let balance = await InventoryBalance.findOne(query);
    if (!balance) {
      balance = new InventoryBalance({
        warehouse: warehouse._id,
        itemType,
        product: itemType === "FinishedGood" ? itemId : undefined,
        rawMaterial: itemType === "RawMaterial" ? itemId : undefined,
        quantityOnHand: 0,
        availableQuantity: 0,
      });
    }

    const diff = adjustedQuantity - balance.quantityOnHand;
    balance.quantityOnHand = adjustedQuantity;
    balance.availableQuantity = Math.max(0, adjustedQuantity - balance.reservedQuantity);
    await balance.save();

    const mvtNum = await generateSequentialId("ADJ", "stock_adjustment");
    await StockMovement.create({
      movementNumber: mvtNum,
      type: "STOCK_ADJUSTMENT",
      itemType,
      product: itemType === "FinishedGood" ? itemId : undefined,
      rawMaterial: itemType === "RawMaterial" ? itemId : undefined,
      sourceWarehouse: diff < 0 ? warehouse._id : undefined,
      destinationWarehouse: diff > 0 ? warehouse._id : undefined,
      quantity: Math.abs(diff),
      remarks: reason || "Manual inventory stock adjustment",
      performedBy: req.user?._id,
    });

    res.status(200).json(ApiResponse.success(balance, "Inventory quantity adjusted successfully"));
  } catch (error) {
    next(error);
  }
};
