import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

let connectionPromise: Promise<void> | null = null;

export const connectDB = async (): Promise<void> => {
  // If already connected, reuse existing connection (crucial for serverless)
  if (mongoose.connection.readyState === 1) {
    return;
  }

  // If a connection is already in progress, await it
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    try {
      mongoose.set("strictQuery", true);
      const uri = env.MONGODB_URI;

      if (!uri) {
        throw new Error("MONGODB_URI environment variable is not defined");
      }

      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 8000,
      });

      logger.info(`✅ Connected to MongoDB at: ${uri.split("@").pop()?.split("?")[0] || "configured URI"}`);
    } catch (directErr: any) {
      connectionPromise = null;

      // In production without in-memory flag, fail with descriptive message
      if (process.env.NODE_ENV === "production" && process.env.USE_IN_MEMORY_DB !== "true") {
        logger.error(`❌ MongoDB connection error: ${directErr.message}`);
        throw new Error(`MongoDB connection failed: ${directErr.message}. Ensure MONGODB_URI is set in Vercel and MongoDB Atlas Network Access whitelist has 0.0.0.0/0 enabled.`);
      }

      logger.warn("⚠️ Direct MongoDB connection failed. Initializing embedded MongoMemoryServer for development...");
      try {
        const { MongoMemoryServer } = await import("mongodb-memory-server");
        const mongod = await MongoMemoryServer.create();
        const memoryUri = mongod.getUri();
        await mongoose.connect(memoryUri);
        logger.info(`✅ Connected to embedded in-memory MongoDB: ${memoryUri}`);
      } catch (memErr: any) {
        throw new Error(`Failed to initialize in-memory DB: ${memErr.message}`);
      }
    }
  })();

  return connectionPromise;
};

export const disconnectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    connectionPromise = null;
  }
};
