import dotenv from 'dotenv';
import logger from './logger';

// Load environment variables
dotenv.config();

import { Client } from 'pg';

/**
 * Ensures that the target database exists on the server.
 * The connection is made to the default "postgres" database and
 * the existence of the target database is checked before attempting to create it.
 */
export const ensureDatabaseExists = async () => {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME || 'rental_management';

  // skip creation step when a managed service is used (Neon/Heroku etc.)
  if (process.env.SKIP_DB_SETUP === 'true') {
    logger.info('Skipping database existence check (SKIP_DB_SETUP=true).');
    return;
  }

  logger.info(`Checking if database "${database}" exists on Postgres server ${host}:${port}...`);

  try {
    const client = new Client({
      host,
      port,
      user,
      password,
      database: 'postgres', // connect to default maintenance db
    });
    await client.connect();
    // check if database exists
    const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
    if (res.rowCount === 0) {
      await client.query(`CREATE DATABASE "${database}"`);
      logger.info(`Created Postgres database "${database}".`);
    } else {
      logger.info(`Postgres database "${database}" already exists.`);
    }
    await client.end();
  } catch (error: any) {
    logger.error(`Failed to ensure database existence: ${error.message}`);
    // We rethrow to prevent the server from trying to connect to a non-existent DB
    throw error;
  }
};
