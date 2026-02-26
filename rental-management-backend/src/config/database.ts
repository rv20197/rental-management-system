import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import logger from '../utils/logger';

// Load environment variables from .env file
dotenv.config();

/**
 * Initialize Sequelize with connection details.
 * Connects to the configured database (Postgres by default) using environment variables.
 */
// Determine dialect from environment variable; default to postgres for new setups
const dialect = (process.env.DB_DIALECT || 'postgres') as 'postgres' | 'mysql';

const sequelizeOptions: any = {
  host: process.env.DB_HOST,
  dialect,
  port: parseInt(process.env.DB_PORT || (dialect === 'mysql' ? '3306' : '5432'), 10), // Connection port
  logging: (msg: string) => logger.debug(msg), // Use custom logger for SQL queries
};

// enable SSL when requested (e.g. Neon, Heroku)
if (dialect === 'postgres' && process.env.DB_SSL === 'true') {
  sequelizeOptions.dialectOptions = {
    ssl: {
      require: true,
      // Neon uses self-signed certs; avoid reject unless you provide CA
      rejectUnauthorized: false,
    },
  };
}

const sequelize = new Sequelize(
  process.env.DB_NAME as string,
  process.env.DB_USER as string,
  process.env.DB_PASSWORD as string,
  sequelizeOptions
);

export default sequelize;
