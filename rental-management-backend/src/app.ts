import dotenv from "dotenv";
dotenv.config();
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import logger from "./utils/logger";
import morganMiddleware from "./middleware/loggingMiddleware";
import { sequelize } from "./models";
import setupSwagger from "./config/swagger";
import { startReminderJob } from "./services/reminderService";
import { ensureDatabaseExists } from "./utils/dbSetup";

import authRoutes from "./routes/authRoutes";
import itemRoutes from "./routes/itemRoutes";
import customerRoutes from "./routes/customerRoutes";
import rentalRoutes from "./routes/rentalRoutes";
import billingRoutes from "./routes/billingRoutes";

/**
 * Instantiate Express Engine instances internally
 */
const app = express();

const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(",") 
  : ["http://localhost:3000", "http://localhost:5173"];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  exposedHeaders: ["Content-Disposition"],
}));
app.use(cookieParser());
app.use(express.json());
app.use(morganMiddleware);

// Boot up Swagger definition docs path mapping
setupSwagger(app);

// Mount core Router files under unified `/api` namespace prefix.
app.use("/api/auth", authRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/rentals", rentalRoutes);
app.use("/api/billings", billingRoutes);

/**
 * Fallback Unhandled Exception Catcher Middleware
 * Avoids raw stack dumping directly to requesting clients.
 */
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(err.stack);
  res.status(500).json({ message: "Internal Server Error" });
});

const PORT = process.env.PORT || 3000;

/**
 * Entry method wrapper. Handles:
 * 1. Database connect/authenticate (dialect controlled via DB_DIALECT)
 * 2. Sequencing initialization (`sync()`)
 * 3. Starting decoupled job processes (like Node-cron)
 * 4. Firing Express `.listen()` logic
 */
const startServer = async () => {
  try {
    // Ensure database exists before attempting to connect via Sequelize
    await ensureDatabaseExists();

    await sequelize.authenticate();
    logger.info("Database connected successfully.");

    // For local dev, keep schema in sync automatically; in production prefer migrations.
    const shouldAlter = process.env.DB_SYNC_ALTER === "true" || process.env.NODE_ENV !== "production";
    if (shouldAlter) {
      await sequelize.sync({ alter: true });
      logger.info("Database synchronized (alter enabled).");
    } else {
      await sequelize.sync();
      logger.info("Database synchronized.");
    }

    // Start Cron Jobs (Automated Notification processes asynchronously mapping to Billings list)
    startReminderJob();

    app.listen(PORT, () => {
      logger.info(`Server is running on port http://localhost:${PORT}`);
      logger.info(
        `Swagger documentation available at http://localhost:${PORT}/api-docs`,
      );
    });
  } catch (error: any) {
    logger.error(`Unable to start the server: ${error.message}`);
    if (error.stack) logger.debug(error.stack);
  }
};

if (process.env.NODE_ENV !== "test") {
  startServer();
}

export default app;
