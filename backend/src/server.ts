import app from "./app.js";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { User } from "./models/User.js";
import { SystemSettings } from "./models/AuditAndSettings.js";

const ensureAdminExists = async (): Promise<void> => {
  try {
    const adminPhone = process.env.ADMIN_PHONE || "01743295827";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin1";

    const admin = await User.findOne({ phone: adminPhone });
    if (!admin) {
      await User.create({
        name: "Admin",
        phone: adminPhone,
        email: "admin@successagro.com",
        password: adminPassword,
        role: "Admin",
        isActive: true,
      });
      logger.info(`Admin account initialized for phone: ${adminPhone}`);
    }

    const settings = await SystemSettings.findOne();
    if (!settings) {
      await SystemSettings.create({
        companyName: "Success Agro Limited",
        tagline: "Quality Agro Solutions for Bangladesh",
        address: "Plot 42, BSCIC Industrial Estate, Bogura, Bangladesh",
        phone: adminPhone,
        email: "admin@successagro.com",
        currency: "BDT",
        currencySymbol: "৳",
        timezone: "Asia/Dhaka",
        vatTaxRegistrationNumber: "BIN-123456789-0101",
      });
    }
  } catch (err) {
    logger.warn(`Failed to verify or initialize admin user: ${err}`);
  }
};

const startServer = async () => {
  try {
    await connectDB();

    // Ensure admin user and foundational system settings exist
    await ensureAdminExists();

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
