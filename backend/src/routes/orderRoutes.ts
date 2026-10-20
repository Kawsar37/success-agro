import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorize.js";
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  updateOrderStatus,
} from "../controllers/orderController.js";

const router = Router();
router.use(authenticate);

router.get("/", getOrders);
router.get("/:id", getOrderById);
router.post("/", createOrder);
router.put("/:id", authorize("ManagingDirector", "Admin"), updateOrder);
router.patch("/:id/status", authorize("ManagingDirector", "Admin"), updateOrderStatus);

export default router;
