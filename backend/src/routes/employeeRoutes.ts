import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorize.js";
import { blockSalesOfficerFromModule } from "../middlewares/salesOfficerGuard.js";
import {
  getEmployees,
  createEmployee,
  getSalaryPayments,
  recordSalaryPayment,
} from "../controllers/employeeController.js";

const router = Router();
router.use(authenticate);
router.use(blockSalesOfficerFromModule);

router.get("/", getEmployees);
router.post("/", authorize("ManagingDirector", "Admin"), createEmployee);

router.get("/salaries", getSalaryPayments);
router.post("/salaries", authorize("ManagingDirector", "Admin"), recordSalaryPayment);

export default router;
