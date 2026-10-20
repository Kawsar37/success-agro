import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorize.js";
import { blockSalesOfficerFromModule } from "../middlewares/salesOfficerGuard.js";
import {
  getInventoryBalances,
  getStockMovements,
  recordStockAdjustment,
} from "../controllers/inventoryController.js";

const router = Router();
router.use(authenticate);
router.use(blockSalesOfficerFromModule);

router.get("/balances", getInventoryBalances);
router.get("/movements", getStockMovements);
router.post(
  "/adjustments",
  authorize("ManagingDirector", "Admin"),
  recordStockAdjustment
);

export default router;
