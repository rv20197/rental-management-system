import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import logger from '../utils/logger';

// Load environment variables from .env file
dotenv.config();

/**
 * Initialize Sequelize with connection details.
 * Connects specifically to MySQL using environment config.
 */
const sequelize = new Sequelize(
  process.env.DB_NAME as string,
  process.env.DB_USER as string,
  process.env.DB_PASSWORD as string,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql', // Database dialect
    port: parseInt(process.env.DB_PORT || '3306', 10), // Connection port
    logging: (msg) => logger.debug(msg), // Use custom logger for SQL queries
  }
);

export default sequelize;
