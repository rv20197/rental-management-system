process.env.NODE_ENV = 'test';
process.env.DB_DIALECT = 'postgres';
process.env.DB_NAME = process.env.DB_NAME || 'rental_management_test';
process.env.DB_USER = process.env.DB_USER || 'user';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'pass';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';

import { sequelize } from '../models';
import { ensureDatabaseExists } from '../utils/dbSetup';

jest.setTimeout(30000);

beforeAll(async () => {
  if (process.env.SKIP_DB_SETUP === 'true') {
    return;
  }
  try {
    await ensureDatabaseExists();
    await sequelize.sync({ force: true });
  } catch (error) {
    console.error('Failed to setup test database:', error);
    process.env.SKIP_DB_SETUP = 'true'; // Fallback to skipping if it fails
  }
});

afterAll(async () => {
  if (process.env.SKIP_DB_SETUP === 'true') {
    return;
  }
  await sequelize.close();
});
