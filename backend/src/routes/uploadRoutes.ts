import { Router, Response, NextFunction } from "express";
import { authenticate, AuthRequest } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorize.js";
import { uploadReceipt } from "../middlewares/upload.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";

const router = Router();
router.use(authenticate);

router.post(
  "/receipt",
  authorize("ManagingDirector", "Admin", "SalesOfficer"),
  uploadReceipt.single("receipt"),
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.file) {
        throw new ApiError(400, "Please select an image file to upload as bank receipt");
      }

      const fileUrl = `/uploads/receipts/${req.file.filename}`;

      res.status(201).json(
        ApiResponse.success(
          {
            fileUrl,
            filename: req.file.filename,
            originalname: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
          },
          "Receipt image uploaded successfully"
        )
      );
    } catch (error) {
      next(error);
    }
  }
);

export default router;
