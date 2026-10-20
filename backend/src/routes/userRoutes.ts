import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorize.js";
import { blockSalesOfficerFromModule } from "../middlewares/salesOfficerGuard.js";
import { getUsers, createUser, deleteUser } from "../controllers/userController.js";

const router = Router();
router.use(authenticate);
router.use(blockSalesOfficerFromModule);

router.get("/", authorize("ManagingDirector", "Admin"), getUsers);
router.post("/", authorize("ManagingDirector", "Admin"), createUser);
router.delete("/:id", authorize("ManagingDirector", "Admin"), deleteUser);

export default router;
