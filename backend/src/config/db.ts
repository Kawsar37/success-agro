import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

let isMemoryServer = false;

export const connectDB = async (): Promise<void> => {
  try {
    mongoose.set("strictQuery", true);
    
    // Attempt standard connection
    try {
      await mongoose.connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 4000,
      });
      logger.info(`✅ Connected to MongoDB at: ${env.MONGODB_URI.split("@").pop()?.split("?")[0] || "configured URI"}`);
      return;
    } catch (directErr) {
      if (env.NODE_ENV === "production") {
        throw directErr;
      }
      logger.warn("⚠️ Direct MongoDB connection failed. Initializing embedded MongoMemoryServer for development...");
      
      const { MongoMemoryServer } = await import("mongodb-memory-server");
      const mongod = await MongoMemoryServer.create();
      const memoryUri = mongod.getUri();
      isMemoryServer = true;
      
      await mongoose.connect(memoryUri);
      logger.info(`✅ Connected to embedded in-memory MongoDB: ${memoryUri}`);
    }
  } catch (error) {
    logger.error("❌ MongoDB connection error:", error);
    throw error;
  }
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
};
