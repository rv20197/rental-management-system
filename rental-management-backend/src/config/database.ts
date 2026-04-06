import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import logger from '../utils/logger';

dotenv.config();

const dialect = process.env.DB_DIALECT || 'postgres';

const sequelizeOptions: any = {
  dialect,
  logging: (msg: string) => logger.debug(msg),
};

// Set port/host only if not using DATABASE_URL
if (!process.env.DATABASE_URL) {
  sequelizeOptions.host = process.env.DB_HOST;
  sequelizeOptions.port = parseInt(process.env.DB_PORT || '5432', 10);
}

// Enable SSL for local/individual-param connections
if (
  dialect === 'postgres' &&
  !process.env.DATABASE_URL &&
  (process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production')
) {
  sequelizeOptions.dialectOptions = {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  };
}

// When using DATABASE_URL, force SSL by appending it to the URL directly
// (Sequelize ignores dialectOptions when parsing a connection string)
function buildDatabaseUrl(url: string): string {
  const parsed = new URL(url);
  parsed.searchParams.set('sslmode', 'require');
  return parsed.toString();
}

const sequelize = process.env.DATABASE_URL
  ? new Sequelize(buildDatabaseUrl(process.env.DATABASE_URL), {
      ...sequelizeOptions,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
    })
  : new Sequelize(
      process.env.DB_NAME as string,
      process.env.DB_USER as string,
      process.env.DB_PASSWORD as string,
      sequelizeOptions
    );

export default sequelize
