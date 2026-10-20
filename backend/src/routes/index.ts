import { Router } from "express";
import authRoutes from "./authRoutes.js";
import masterDataRoutes from "./masterDataRoutes.js";
import orderRoutes from "./orderRoutes.js";
import invoiceRoutes from "./invoiceRoutes.js";
import inventoryRoutes from "./inventoryRoutes.js";
import productionRoutes from "./productionRoutes.js";
import accountsRoutes from "./accountsRoutes.js";
import employeeRoutes from "./employeeRoutes.js";
import reportsRoutes from "./reportsRoutes.js";
import systemRoutes from "./systemRoutes.js";
import userRoutes from "./userRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
import uploadRoutes from "./uploadRoutes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/master-data", masterDataRoutes);
router.use("/orders", orderRoutes);
router.use("/invoices", invoiceRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/production", productionRoutes);
router.use("/accounts", accountsRoutes);
router.use("/employees", employeeRoutes);
router.use("/reports", reportsRoutes);
router.use("/system", systemRoutes);
router.use("/users", userRoutes);
router.use("/notifications", notificationRoutes);
router.use("/uploads", uploadRoutes);

export default router;
