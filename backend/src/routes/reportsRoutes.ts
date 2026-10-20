import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { blockSalesOfficerFromModule } from "../middlewares/salesOfficerGuard.js";
import {
  getExecutiveDashboardMetrics,
  getSalesReport,
  getFinancialReport,
  getProductionReport,
  getInventoryReport,
} from "../controllers/reportsController.js";

const router = Router();
router.use(authenticate);
router.use(blockSalesOfficerFromModule);

router.get("/dashboard-metrics", getExecutiveDashboardMetrics);
router.get("/sales", getSalesReport);
router.get("/financial", getFinancialReport);
router.get("/production", getProductionReport);
router.get("/inventory", getInventoryReport);

export default router;
