// src/scripts/export-swagger.ts
import fs from 'fs';
import { swaggerSpec } from '../config/swagger';
import logger from '../utils/logger';

fs.writeFileSync('swagger.json', JSON.stringify(swaggerSpec, null, 2));
logger.info('written swagger.json');