import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorize.js";
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  updateOrderStatus,
  cancelOrder,
} from "../controllers/orderController.js";

const router = Router();
router.use(authenticate);

router.get("/", getOrders);
router.get("/:id", getOrderById);
router.post("/", createOrder);
router.put("/:id", authorize("ManagingDirector", "Admin"), updateOrder);

// Status updates (supports both PATCH and PUT to prevent route not found errors)
router.patch("/:id/status", authorize("ManagingDirector", "Admin"), updateOrderStatus);
router.put("/:id/status", authorize("ManagingDirector", "Admin"), updateOrderStatus);

// Direct cancellation routes (supports POST, PUT, and PATCH)
router.post("/:id/cancel", authorize("ManagingDirector", "Admin"), cancelOrder);
router.put("/:id/cancel", authorize("ManagingDirector", "Admin"), cancelOrder);
router.patch("/:id/cancel", authorize("ManagingDirector", "Admin"), cancelOrder);

export default router;
