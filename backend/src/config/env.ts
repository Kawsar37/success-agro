import dotenv from "dotenv";
dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "5000", 10),
  MONGODB_URI: (process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/success_agro").trim(),
  JWT_SECRET: process.env.JWT_SECRET || "success_agro_super_secure_jwt_secret_key_2026",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
  CURRENCY: "BDT",
  CURRENCY_SYMBOL: "৳",
  TIMEZONE: "Asia/Dhaka",
};
