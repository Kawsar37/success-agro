import app from "./app.js";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { autoSeedIfEmpty } from "./seeds/seed.js";

const startServer = async () => {
  try {
    await connectDB();

    // Auto-seed initial admin and foundational catalog if empty
    await autoSeedIfEmpty();

    app.listen(env.PORT, () => {
      logger.info(`🚀 Success Agro Management API server listening on http://localhost:${env.PORT}`);
      logger.info(`📡 Environment: ${env.NODE_ENV}`);
      logger.info(`🌾 Ready for business operations in Bangladesh (${env.TIMEZONE})`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
