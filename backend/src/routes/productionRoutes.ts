import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorize.js";
import { blockSalesOfficerFromModule } from "../middlewares/salesOfficerGuard.js";
import {
  getBOMs,
  createBOM,
  getProductionOrders,
  createProductionOrder,
  completeProductionOrder,
} from "../controllers/productionController.js";

const router = Router();
router.use(authenticate);
router.use(blockSalesOfficerFromModule);

router.get("/boms", getBOMs);
router.post("/boms", authorize("ManagingDirector", "Admin"), createBOM);

router.get("/orders", getProductionOrders);
router.post("/orders", authorize("ManagingDirector", "Admin"), createProductionOrder);
router.patch(
  "/orders/:id/complete",
  authorize("ManagingDirector", "Admin"),
  completeProductionOrder
);

export default router;
