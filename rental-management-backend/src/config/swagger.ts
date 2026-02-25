import { Options } from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';

/**
 * Swagger configuration options
 * Defines API metadata, servers, and security configurations
 */
const options: Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Goods Rental API',
      version: '1.0.0',
      description: 'API for managing rental goods, customers, rentals, and billing reminders.',
    },
    servers: [
      {
        url: 'http://localhost:3000/api', // Base URL for all endpoints
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT', // JWT token used for auth
        },
      },
    },
    security: [
      {
        bearerAuth: [], // Apply Bearer Authentication globally or to specific endpoints
      },
    ],
  },
  apis: [
    process.env.NODE_ENV === 'production' 
      ? './dist/routes/*.js' 
      : './src/routes/*.ts',
    process.env.NODE_ENV === 'production'
      ? './dist/models/*.js'
      : './src/models/*.ts'
  ],
};

const swaggerSpec = swaggerJsdoc(options);

/**
 * Mounts Swagger UI to the Express app
 * @param app The main Express application instance
 */
// export the spec itself so other modules/tests can inspect it if needed
export { swaggerSpec };

const setupSwagger = (app: Express): void => {
  // Swagger UI at /api-docs
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // also expose the raw JSON definition for easy downloading or tooling
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};

export default setupSwagger;
