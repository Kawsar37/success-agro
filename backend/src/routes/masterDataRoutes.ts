import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorize.js";
import {
  getTerritories,
  createTerritory,
  getSalesOfficers,
  createSalesOfficer,
  getDealers,
  getDealerById,
  createDealer,
  updateDealer,
  deleteDealer,
  getCategories,
  createCategory,
  getUnits,
  createUnit,
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  getWarehouses,
  createWarehouse,
  getSuppliers,
  createSupplier,
  getRawMaterials,
  createRawMaterial,
} from "../controllers/masterDataController.js";

const router = Router();
router.use(authenticate);

// Territories
router.get("/territories", getTerritories);
router.post("/territories", authorize("ManagingDirector", "Admin"), createTerritory);

// Sales Officers
router.get("/sales-officers", getSalesOfficers);
router.post("/sales-officers", authorize("ManagingDirector", "Admin"), createSalesOfficer);

// Dealers
router.get("/dealers", getDealers);
router.get("/dealers/:id", getDealerById);
router.post("/dealers", authorize("ManagingDirector", "Admin"), createDealer);
router.put("/dealers/:id", authorize("ManagingDirector", "Admin"), updateDealer);
router.delete("/dealers/:id", authorize("ManagingDirector", "Admin"), deleteDealer);

// Categories & Units
router.get("/categories", getCategories);
router.post("/categories", authorize("ManagingDirector", "Admin"), createCategory);
router.get("/units", getUnits);
router.post("/units", authorize("ManagingDirector", "Admin"), createUnit);

// Products
router.get("/products", getProducts);
router.get("/products/:id", getProductById);
router.post("/products", authorize("ManagingDirector", "Admin"), createProduct);
router.put("/products/:id", authorize("ManagingDirector", "Admin"), updateProduct);

// Warehouses
router.get("/warehouses", getWarehouses);
router.post("/warehouses", authorize("ManagingDirector", "Admin"), createWarehouse);

// Suppliers
router.get("/suppliers", getSuppliers);
router.post("/suppliers", authorize("ManagingDirector", "Admin"), createSupplier);

// Raw Materials
router.get("/raw-materials", getRawMaterials);
router.post("/raw-materials", authorize("ManagingDirector", "Admin"), createRawMaterial);

export default router;
