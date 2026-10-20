import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorize.js";
import { blockSalesOfficerFromModule } from "../middlewares/salesOfficerGuard.js";
import {
  getSystemSettings,
  updateSystemSettings,
  getAuditLogs,
} from "../controllers/systemController.js";

const router = Router();
router.use(authenticate);
router.use(blockSalesOfficerFromModule);

router.get("/settings", getSystemSettings);
router.put("/settings", authorize("ManagingDirector", "Admin"), updateSystemSettings);
router.patch("/settings", authorize("ManagingDirector", "Admin"), updateSystemSettings);
router.get("/audit-logs", authorize("ManagingDirector", "Admin"), getAuditLogs);

export default router;
