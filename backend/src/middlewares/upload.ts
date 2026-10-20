import multer from "multer";
import path from "path";
import fs from "fs";
import os from "os";
import { Request } from "express";
import { ApiError } from "../utils/apiError.js";

// In serverless environments (e.g. Vercel, AWS Lambda), the deployment directory is strictly read-only.
// /tmp (os.tmpdir()) is the only writable directory.
const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const UPLOAD_ROOT = isServerless
  ? path.join(os.tmpdir(), "uploads", "receipts")
  : path.join(process.cwd(), "uploads", "receipts");

// Ensure receipts upload directory exists safely without crashing read-only runtimes
try {
  if (!fs.existsSync(UPLOAD_ROOT)) {
    fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
  }
} catch (e) {
  // Gracefully continue in serverless read-only contexts
}

const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    try {
      if (!fs.existsSync(UPLOAD_ROOT)) {
        fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
      }
      cb(null, UPLOAD_ROOT);
    } catch (err: any) {
      cb(err, UPLOAD_ROOT);
    }
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `receipt-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "image/webp",
    "application/pdf",
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        "Invalid file format. Only JPG, PNG, WEBP, and PDF files are allowed for bank receipts."
      )
    );
  }
};

export const uploadReceipt = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter,
});
