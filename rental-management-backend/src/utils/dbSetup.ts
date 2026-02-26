import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import logger from './logger';

// Load environment variables
dotenv.config();

/**
 * Ensures that the target database exists on the MySQL server.
 * Connects to the server without a database name and executes CREATE DATABASE IF NOT EXISTS.
 */
export const ensureDatabaseExists = async () => {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME || 'rental_management';

  try {
    logger.info(`Checking if database "${database}" exists on ${host}:${port}...`);
    
    // Connect without database parameter
    const connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
    });

    // Use backticks to escape database name in case of special characters
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
    
    await connection.end();
    logger.info(`Database "${database}" is ready.`);
  } catch (error: any) {
    logger.error(`Failed to ensure database existence: ${error.message}`);
    // We rethrow to prevent the server from trying to connect to a non-existent DB
    throw error;
  }
};
