import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import logger from '../utils/logger';

// Load environment variables from .env file
dotenv.config();

/**
 * Initialize Sequelize with connection details.
 * Connects to the configured database (Postgres by default) using environment variables.
 */
// Standardized on Postgres
const dialect = 'postgres';

const sequelizeOptions: any = {
  dialect,
  logging: (msg: string) => logger.debug(msg),
};

// Set port/host only if not using DATABASE_URL
if (!process.env.DATABASE_URL) {
  sequelizeOptions.host = process.env.DB_HOST;
  sequelizeOptions.port = parseInt(process.env.DB_PORT || '5432', 10);
}

// enable SSL when requested (e.g. Neon, Heroku) or in production
if (dialect === 'postgres' && (process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production')) {
  sequelizeOptions.dialectOptions = {
    ssl: {
      require: true,
      // Neon uses self-signed certs; avoid reject unless you provide CA
      rejectUnauthorized: false,
    },
  };
}

const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, sequelizeOptions)
  : new Sequelize(
    process.env.DB_NAME as string,
    process.env.DB_USER as string,
    process.env.DB_PASSWORD as string,
    sequelizeOptions
  );

export default sequelize;
