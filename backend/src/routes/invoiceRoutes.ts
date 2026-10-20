import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorize.js";
import { blockSalesOfficerFromModule } from "../middlewares/salesOfficerGuard.js";
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateDeliveryStatus,
} from "../controllers/invoiceController.js";

const router = Router();
router.use(authenticate);

router.get("/", getInvoices);
router.get("/:id", getInvoiceById);
router.post(
  "/",
  blockSalesOfficerFromModule,
  authorize("ManagingDirector", "Admin"),
  createInvoice
);
router.patch(
  "/:id/delivery-status",
  authorize("ManagingDirector", "Admin", "DeliveryMan"),
  updateDeliveryStatus
);

export default router;
