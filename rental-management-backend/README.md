# Goods Rental Management Backend

A comprehensive backend service for managing a goods/equipment rental business. Built with Node.js, Express, Sequelize (PostgreSQL by default), and documented using Swagger.

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Prerequisites](#prerequisites)
3. [Setup & Installation](#setup--installation)
4. [Environment Variables](#environment-variables)
5. [Database Schema / Models](#database-schema--models)
6. [API Endpoints Overview](#api-endpoints-overview)
7. [Debugging Guide](#debugging-guide)
8. [Automated Services](#automated-services)

---

## Tech Stack

- **Framework**: Express.js
- **Database**: PostgreSQL (configurable via DB_DIALECT)
- **ORM**: Sequelize
- **Authentication**: JWT (JSON Web Tokens) & BcryptJS
- **API Documentation**: Swagger (swagger-jsdoc & swagger-ui-express)
- **Task Scheduling**: Node-cron (for daily reminder jobs)

---

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher recommended)
- [PostgreSQL](https://www.postgresql.org/) running locally or via a cloud provider.

---

## Setup & Installation

1. **Clone the repository** (if applicable) or navigate to the project directory:
   ```bash
   cd c:\Vatsal\Projects\rental-management-backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Database Creation**:
   - The application is configured to automatically create the database if it doesn't exist. Ensure your PostgreSQL server is running and the credentials in `.env` are correct (you can override dialect with DB_DIALECT if using MySQL).
   - When connecting to a managed service such as **Neon**, set `DB_SSL=true` and
     `SKIP_DB_SETUP=true` in your `.env`. These providers usually pre‑provision the
     database and require SSL connections.

4. **Run the server**:
   - For development (with auto-restart via nodemon):
     ```bash
     npm run dev
     ```
   - For production (after building):
     ```bash
     npm run build
     npm start
     ```

   - **Docker/docker‑compose** (recommended for full-stack setup):
     ```bash
     docker-compose up --build
     # backend will be on http://localhost:4000
     # frontend served at http://localhost:3000
     ```
     Environment variables for Docker are defined in `docker-compose.yml` (DB_* and PORT, JWT_SECRET, etc.).

> **Developer note**: the project currently uses `sequelize.sync({ alter: true })` by default in development to keep the database schema in sync. In production, it is recommended to transition to a migration-based approach (e.g., Sequelize CLI). 


---

## Environment Variables

The project uses a `.env` file for configuration. Check that it contains:

```env
PORT=4000
DB_DIALECT=postgres   # or mysql if you need backwards compatibility
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgrespassword
DB_NAME=rental_management
JWT_SECRET=supersecretjwtkey123
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password_here
FROM_NAME=Rental Management
FROM_EMAIL=your_email@gmail.com
```

---

## Database Schema / Models

The database consists of the following 5 models:

1. **User**: Handles authentication and roles.
   - `id`, `name`, `email`, `password`, `role` (admin/manager).
2. **Item**: Represents the goods available for rent.
   - `id`, `name`, `description`, `category`, `status` (available, rented, maintenance), `monthlyRate`.
3. **Customer**: Records personal information of the people renting items.
   - `id`, `firstName`, `lastName`, `email`, `phone`, `address`.
4. **Rental**: A transactional record linking an Item to a Customer for a specific timeframe.
   - `id`, `itemId` (FK), `customerId` (FK), `startDate`, `endDate`, `depositAmount`, `status` (active, completed, cancelled).
5. **Billing**: Invoices connected to Rentals.
   - `id`, `rentalId` (FK), `amount`, `dueDate`, `status` (pending, paid, overdue), `paymentDate`.

---

## API Endpoints Overview

For a live interaction with APIs, Swagger is enabled. Once the server is running, visit:
**[http://localhost:4000/api-docs](http://localhost:4000/api-docs)**

Overview of standard routes:

- **Authentication**
  - `POST /api/auth/register` (Registers a new manager/admin)
  - `POST /api/auth/login` (Returns a Bearer token. Use it by clicking "Authorize" in Swagger to access restricted routes).

- **Items**
  - `GET /api/items` (All)
  - `POST /api/items` (Create - Admin only)
  - `GET /api/items/:id` (One)
  - `PUT /api/items/:id` (Update - Admin only)
  - `DELETE /api/items/:id` (Delete - Admin only)

- **Customers**
  - `GET /api/customers`
  - `POST /api/customers`
  - `GET /api/customers/:id`
  - `PUT /api/customers/:id`
  - `DELETE /api/customers/:id` (Admin only)

- **Rentals**
  - `GET /api/rentals`
  - `POST /api/rentals`
  - `GET /api/rentals/:id`
  - `PUT /api/rentals/:id`
  - `DELETE /api/rentals/:id` (Admin only)

- **Billings**
  - `GET /api/billings`
  - `POST /api/billings`
  - `GET /api/billings/:id`
  - `PUT /api/billings/:id/pay` (Custom route to mark a bill as paid)
  - `POST /api/billings/return` (Process rental return and generate bill automatically)
  - `DELETE /api/billings/:id` (Admin only)

### Automated Billing Logic
The system automatically calculates the bill amount upon item return based on the following rules:
- **Return before the 5th**: No charge for the current month.
- **Return between 5th and 15th**: Charge for 15 days (0.5 months).
- **Return after the 15th**: Charge for the whole month (1.0 month).
- **Full Months**: Any full calendar month between the start date and the return month is charged at the full monthly rate.

---

## Debugging Guide

**1. Foreign Key/Association Issues**
If you get a 500 server error around missing properties (e.g., trying to access `bill.Rental` and getting undefined):
- Make sure the foreign keys align (e.g., `itemId`, `customerId` are correctly formed as IDs).
- Verify associations are properly defined in `src/models/index.js`.
- If a schema changed, Sequelize might lack the column. Use `DB_SYNC_ALTER=true` in `.env` to allow Sequelize to automatically alter the tables. (In development mode, this is enabled by default).

**2. Authentication/401 Errors**
- Pass the token as a Bearer token: `Authorization: Bearer <your_jwt_token>`.
- Is the role restricted? Creating items (`/items` POST) typically requires `admin` privileges (see `authMiddleware.js` & `itemRoutes.js`). Change your user role manually in the database to `admin` if testing.

**3. Database Connection Error**
- `SequelizeConnectionError` or `Access denied`: Check that your database server is active and the credentials in `.env` match your local instance.
- If using Docker, use the credentials defined in `docker-compose.yml`.
- The application automatically attempts to create the database named `DB_NAME` if it doesn't exist.

**4. Seeing SQL Queries Output**
- Need to know what exact query Sequelize runs against the database? 
- Open `src/config/database.js`
- Change `logging: false` to `logging: console.log`. Restart the server. Now any endpoint you hit will translate standard SQL statements in your console.

---

## Automated Services

### Daily Email/System Reminders
A cron-job script (`src/services/reminderService.js`) runs once daily at **8:00 AM**. 
- It scans the **Billing** table.
- Finds any unpaid bills expiring in exactly 3 days.
- Marks bills as `overdue` when the `dueDate` passes.

*To debug the Cron Job effectively:*
Change the Cron timer from `0 8 * * *` (8 AM daily) to `* * * * *` (runs every minute), and observe the console logs for pending and overdue bills dynamically!

---

## Docker Development & Production
A `docker-compose.yml` at the repository root can start the database, backend and frontend together. The backend image is built from `rental-management-backend/Dockerfile` and exposes port `4000`.  

**Important environment variables (set in `docker-compose.yml` or via your own `.env`):**
```
DB_DIALECT, DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT
PORT (default 4000)
JWT_SECRET
```

Use `docker-compose up --build` to bring everything up. To rebuild just the backend:
```bash
docker-compose build backend
```

