import { Response, NextFunction } from "express";
import { Territory } from "../models/Territory.js";
import { SalesOfficer } from "../models/SalesOfficer.js";
import { Dealer } from "../models/Dealer.js";
import { ProductCategory, UnitOfMeasurement } from "../models/ProductMeta.js";
import { Product } from "../models/Product.js";
import { Warehouse, Supplier } from "../models/WarehouseAndSupplier.js";
import { RawMaterial } from "../models/Inventory.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { AuthRequest } from "../middlewares/auth.js";
import { generateSimpleId } from "../utils/idGenerator.js";
import { logAuditEvent } from "../utils/auditLogger.js";

// ======================== TERRITORIES ========================
export const getTerritories = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const territories = await Territory.find().sort({ region: 1, name: 1 });
    res.status(200).json(ApiResponse.success(territories));
  } catch (error) {
    next(error);
  }
};

export const createTerritory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const territory = await Territory.create(req.body);
    await logAuditEvent({
      userId: (req.user?._id as any)?.toString(),
      userName: req.user?.name,
      action: "CREATE_TERRITORY",
      module: "MASTER_DATA",
      targetId: territory.name,
      ipAddress: req.ip,
    });
    res.status(201).json(ApiResponse.success(territory, "Territory created successfully"));
  } catch (error) {
    next(error);
  }
};

// ======================== SALES OFFICERS ========================
export const getSalesOfficers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const officers = await SalesOfficer.find()
      .populate("territory", "name region district")
      .populate("user", "name email role isActive")
      .sort({ name: 1 });
    res.status(200).json(ApiResponse.success(officers));
  } catch (error) {
    next(error);
  }
};

export const createSalesOfficer = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const officerCode = req.body.officerCode || (await generateSimpleId("SO", "sales_officer"));
    const officer = await SalesOfficer.create({ ...req.body, officerCode });
    res.status(201).json(ApiResponse.success(officer, "Sales Officer created successfully"));
  } catch (error) {
    next(error);
  }
};

// ======================== DEALERS ========================
export const getDealers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query: any = {};
    if (req.user?.role === "SalesOfficer") {
      query.assignedSalesOfficer = req.user.salesOfficerProfile;
    } else {
      if (req.query.salesOfficer) query.assignedSalesOfficer = req.query.salesOfficer;
      if (req.query.territory) query.territory = req.query.territory;
      if (req.query.status) query.status = req.query.status;
    }

    const dealers = await Dealer.find(query)
      .populate("territory", "name region district")
      .populate("assignedSalesOfficer", "officerCode name phone")
      .sort({ businessName: 1 });

    res.status(200).json(ApiResponse.success(dealers));
  } catch (error) {
    next(error);
  }
};

export const getDealerById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const dealer = await Dealer.findById(req.params.id)
      .populate("territory")
      .populate("assignedSalesOfficer");

    if (!dealer) throw new ApiError(404, "Dealer not found");

    if (
      req.user?.role === "SalesOfficer" &&
      String(dealer.assignedSalesOfficer?._id || dealer.assignedSalesOfficer) !==
        String(req.user.salesOfficerProfile)
    ) {
      throw new ApiError(403, "Access denied: Dealer assigned to another sales officer");
    }

    res.status(200).json(ApiResponse.success(dealer));
  } catch (error) {
    next(error);
  }
};

export const createDealer = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      businessName,
      proprietorName,
      phone,
      address,
      territory,
      assignedSalesOfficer,
      creditLimit = 0,
      openingBalance = 0,
      dealerCode: customCode,
      status = "Active",
    } = req.body;

    if (!businessName || !proprietorName || !phone || !address) {
      throw new ApiError(400, "Business name, proprietor name, phone, and address are required");
    }

    // Resolve or fallback territory
    let resolvedTerritory = territory;
    if (!resolvedTerritory) {
      const defaultTerritory = await Territory.findOne();
      if (defaultTerritory) {
        resolvedTerritory = defaultTerritory._id;
      } else {
        const newTerritory = await Territory.create({ name: "Central Territory", region: "Bogura", district: "Bogura" });
        resolvedTerritory = newTerritory._id;
      }
    }

    const dealerCode = customCode || (await generateSimpleId("DLR", "dealer"));
    const numOpening = Number(openingBalance) || 0;
    const numCredit = Number(creditLimit) || 0;

    const dealer = await Dealer.create({
      ...req.body,
      dealerCode,
      businessName,
      proprietorName,
      phone,
      address,
      territory: resolvedTerritory,
      assignedSalesOfficer: assignedSalesOfficer || undefined,
      creditLimit: numCredit,
      openingBalance: numOpening,
      currentBalance: numOpening,
      status,
    });

    await logAuditEvent({
      userId: (req.user?._id as any)?.toString(),
      userName: req.user?.name,
      action: "CREATE_DEALER",
      module: "MASTER_DATA",
      targetId: dealer.dealerCode,
      details: { businessName: dealer.businessName, proprietor: dealer.proprietorName },
      ipAddress: req.ip,
    });

    const populated = await Dealer.findById(dealer._id)
      .populate("territory", "name region")
      .populate("assignedSalesOfficer", "officerCode name phone");

    res.status(201).json(ApiResponse.success(populated, "Dealer registered successfully"));
  } catch (error) {
    next(error);
  }
};

export const updateDealer = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const dealer = await Dealer.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate("territory", "name region")
      .populate("assignedSalesOfficer", "officerCode name phone");

    if (!dealer) throw new ApiError(404, "Dealer not found");

    await logAuditEvent({
      userId: (req.user?._id as any)?.toString(),
      userName: req.user?.name,
      action: "UPDATE_DEALER",
      module: "MASTER_DATA",
      targetId: dealer.dealerCode,
      details: { businessName: dealer.businessName },
      ipAddress: req.ip,
    });

    res.status(200).json(ApiResponse.success(dealer, "Dealer updated successfully"));
  } catch (error) {
    next(error);
  }
};

export const deleteDealer = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const dealer = await Dealer.findById(req.params.id);
    if (!dealer) throw new ApiError(404, "Dealer not found");

    await Dealer.findByIdAndDelete(req.params.id);

    await logAuditEvent({
      userId: (req.user?._id as any)?.toString(),
      userName: req.user?.name,
      action: "DELETE_DEALER",
      module: "MASTER_DATA",
      targetId: dealer.dealerCode,
      details: { businessName: dealer.businessName },
      ipAddress: req.ip,
    });

    res.status(200).json(ApiResponse.success(null, "Dealer deleted successfully"));
  } catch (error) {
    next(error);
  }
};

// ======================== CATEGORIES & UNITS ========================
export const getCategories = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const categories = await ProductCategory.find({ isActive: true }).sort({ name: 1 });
    res.status(200).json(ApiResponse.success(categories));
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const category = await ProductCategory.create(req.body);
    res.status(201).json(ApiResponse.success(category, "Product category created"));
  } catch (error) {
    next(error);
  }
};

export const getUnits = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const units = await UnitOfMeasurement.find({ isActive: true }).sort({ name: 1 });
    res.status(200).json(ApiResponse.success(units));
  } catch (error) {
    next(error);
  }
};

export const createUnit = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const unit = await UnitOfMeasurement.create(req.body);
    res.status(201).json(ApiResponse.success(unit, "Unit of measurement created"));
  } catch (error) {
    next(error);
  }
};

// ======================== PRODUCTS ========================
export const getProducts = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const products = await Product.find({ isActive: true })
      .populate("category", "name")
      .populate("unit", "name symbol")
      .sort({ name: 1 });
    res.status(200).json(ApiResponse.success(products));
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("category")
      .populate("unit");
    if (!product) throw new ApiError(404, "Product not found");
    res.status(200).json(ApiResponse.success(product));
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      name,
      banglaName,
      packSize,
      cartonSize,
      tradePrice,
      mrp,
      minimumStockAlert,
      category,
      unit,
      productCode: customCode,
    } = req.body;

    if (!name || tradePrice === undefined || mrp === undefined) {
      throw new ApiError(400, "Product name, trade price (dealer price), and MRP are required");
    }

    // Resolve or fallback category
    let resolvedCategory = category;
    if (!resolvedCategory) {
      const defaultCat = await ProductCategory.findOne();
      if (defaultCat) {
        resolvedCategory = defaultCat._id;
      } else {
        const newCat = await ProductCategory.create({ name: "General Agro Products" });
        resolvedCategory = newCat._id;
      }
    }

    // Resolve or fallback unit
    let resolvedUnit = unit;
    if (!resolvedUnit) {
      const defaultUnit = await UnitOfMeasurement.findOne();
      if (defaultUnit) {
        resolvedUnit = defaultUnit._id;
      } else {
        const newUnit = await UnitOfMeasurement.create({
          name: "Bottle",
          symbol: "btl",
          baseType: "package",
        });
        resolvedUnit = newUnit._id;
      }
    }

    const productCode = customCode || (await generateSimpleId("PRD", "product"));
    const product = await Product.create({
      productCode,
      name,
      banglaName,
      category: resolvedCategory,
      unit: resolvedUnit,
      packSize: packSize || "1 unit",
      cartonSize: Number(cartonSize) || 1,
      tradePrice: Number(tradePrice),
      mrp: Number(mrp),
      minimumStockAlert: Number(minimumStockAlert) || 50,
      isActive: true,
    });

    await logAuditEvent({
      userId: (req.user?._id as any)?.toString(),
      userName: req.user?.name,
      action: "CREATE_PRODUCT",
      module: "MASTER_DATA",
      targetId: product.productCode,
      details: { name: product.name, tradePrice: product.tradePrice, mrp: product.mrp },
      ipAddress: req.ip,
    });

    const populated = await Product.findById(product._id)
      .populate("category", "name code")
      .populate("unit", "name symbol");

    res.status(201).json(ApiResponse.success(populated, "Product item created and prices set successfully"));
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, banglaName, packSize, cartonSize, tradePrice, mrp, minimumStockAlert, category, unit, isActive } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (banglaName !== undefined) updateData.banglaName = banglaName;
    if (packSize !== undefined) updateData.packSize = packSize;
    if (cartonSize !== undefined) updateData.cartonSize = Number(cartonSize);
    if (tradePrice !== undefined) updateData.tradePrice = Number(tradePrice);
    if (mrp !== undefined) updateData.mrp = Number(mrp);
    if (minimumStockAlert !== undefined) updateData.minimumStockAlert = Number(minimumStockAlert);
    if (category !== undefined) updateData.category = category;
    if (unit !== undefined) updateData.unit = unit;
    if (isActive !== undefined) updateData.isActive = isActive;

    const product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true })
      .populate("category", "name code")
      .populate("unit", "name symbol");

    if (!product) throw new ApiError(404, "Product not found");

    await logAuditEvent({
      userId: (req.user?._id as any)?.toString(),
      userName: req.user?.name,
      action: "UPDATE_PRODUCT_PRICE",
      module: "MASTER_DATA",
      targetId: product.productCode,
      details: { name: product.name, tradePrice: product.tradePrice, mrp: product.mrp },
      ipAddress: req.ip,
    });

    res.status(200).json(ApiResponse.success(product, "Product details and prices updated successfully"));
  } catch (error) {
    next(error);
  }
};

// ======================== WAREHOUSES ========================
export const getWarehouses = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const warehouses = await Warehouse.find({ isActive: true }).sort({ name: 1 });
    res.status(200).json(ApiResponse.success(warehouses));
  } catch (error) {
    next(error);
  }
};

export const createWarehouse = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const code = req.body.code || (await generateSimpleId("WH", "warehouse"));
    const warehouse = await Warehouse.create({ ...req.body, code });
    res.status(201).json(ApiResponse.success(warehouse, "Warehouse registered successfully"));
  } catch (error) {
    next(error);
  }
};

// ======================== SUPPLIERS ========================
export const getSuppliers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const suppliers = await Supplier.find({ isActive: true }).sort({ name: 1 });
    res.status(200).json(ApiResponse.success(suppliers));
  } catch (error) {
    next(error);
  }
};

export const createSupplier = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const supplierCode = req.body.supplierCode || (await generateSimpleId("SUP", "supplier"));
    const supplier = await Supplier.create({ ...req.body, supplierCode });
    res.status(201).json(ApiResponse.success(supplier, "Supplier registered successfully"));
  } catch (error) {
    next(error);
  }
};

// ======================== RAW MATERIALS ========================
export const getRawMaterials = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const materials = await RawMaterial.find({ isActive: true })
      .populate("unit", "name symbol")
      .sort({ name: 1 });
    res.status(200).json(ApiResponse.success(materials));
  } catch (error) {
    next(error);
  }
};

export const createRawMaterial = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const materialCode = req.body.materialCode || (await generateSimpleId("RM", "raw_material"));
    const material = await RawMaterial.create({ ...req.body, materialCode });
    res.status(201).json(ApiResponse.success(material, "Raw material registered successfully"));
  } catch (error) {
    next(error);
  }
};
