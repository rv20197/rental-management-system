# Goods Rental Management System

A full-stack application for managing a goods/equipment rental business. Built with a Node.js/Express backend and a React frontend.

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Prerequisites](#prerequisites)
5. [Setup & Installation](#setup--installation)
    - [Docker (Recommended)](#docker-recommended)
    - [Manual Setup (Local Development)](#manual-setup-local-development)
6. [Environment Variables](#environment-variables)
7. [Scripts](#scripts)
8. [API Documentation](#api-documentation)
9. [Automated Services](#automated-services)
10. [Debugging Guide](#debugging-guide)
11. [TODOs & Future Improvements](#todos--future-improvements)
12. [License](#license)

---

## Overview

The Goods Rental Management System is designed to streamline the operations of rental businesses. It features user authentication, item inventory management, customer tracking, rental transactions, and automated billing with email reminders.

---

## Tech Stack

### Backend
- **Framework**: Express.js (Node.js)
- **Language**: TypeScript
- **Database**: MySQL 8.0
- **ORM**: Sequelize (with `sequelize-typescript`)
- **Authentication**: JWT & BcryptJS
- **Documentation**: Swagger (OpenAPI 3.0)
- **Scheduling**: Node-cron (for daily reminders)
- **Mailing**: Nodemailer
- **PDF Generation**: PDFKit

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite
- **Language**: TypeScript
- **State Management**: Redux Toolkit
- **Routing**: React Router
- **Styling**: Tailwind CSS, Shadcn/UI (Radix UI)
- **Forms & Validation**: React Hook Form, Zod
- **API Client**: Axios

---

## Project Structure

```text
.
├── rental-management-backend/  # Express API source code
├── rental-management-frontend/ # React SPA source code
├── docker-compose.yml          # Docker composition for full-stack
├── LICENSE                     # Apache 2.0 License
└── README.md                   # Main documentation
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) (v9 or higher)
- [MySQL](https://www.mysql.com/) (v8.0)
- [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/) (optional, for containerized setup)

---

## Setup & Installation

### Docker (Recommended)

The easiest way to get the entire system running is using Docker Compose.

1.  **Clone the repository**.
2.  **Run Docker Compose**:
    ```bash
    docker-compose up --build
    ```
    - The backend will be available at `http://localhost:4000`.
    - The frontend will be available at `http://localhost:3000`.
    - MySQL will be running on port `3306`.

### Manual Setup (Local Development)

#### 1. Backend Setup

1.  Navigate to the backend directory:
    ```bash
    cd rental-management-backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure `.env` file (copy from `.env.example` if available, or create one based on the [Environment Variables](#environment-variables) section).
4.  Ensure MySQL is running and the database `rental_management` exists.
5.  Start the development server:
    ```bash
    npm run dev
    ```

#### 2. Frontend Setup

1.  Navigate to the frontend directory:
    ```bash
    cd rental-management-frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure `.env` file (ensure `VITE_API_URL` points to your backend).
4.  Start the development server:
    ```bash
    npm run dev
    ```
    - Local dev server usually runs at `http://localhost:5173`.

---

## Environment Variables

### Backend (`rental-management-backend/.env`)

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Backend server port | `4000` |
| `DB_HOST` | MySQL database host | `localhost` |
| `DB_PORT` | MySQL database port | `3306` |
| `DB_USER` | MySQL database user | `root` |
| `DB_PASSWORD` | MySQL database password | - |
| `DB_NAME` | MySQL database name | `rental_management` |
| `JWT_SECRET` | Secret key for JWT signing | - |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |
| `SMTP_HOST` | SMTP server for emails | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP username | - |
| `SMTP_PASS` | SMTP password | - |

### Frontend (`rental-management-frontend/.env`)

| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_API_URL` | URL of the backend API | `http://localhost:4000` |

---

## Scripts

### Backend

- `npm run dev`: Starts the server with `nodemon` and `ts-node`.
- `npm run build`: Compiles TypeScript to JavaScript in the `dist` folder.
- `npm start`: Runs the compiled backend from the `dist` folder.
- `npm run export:swagger`: Generates a `swagger.json` file.

### Frontend

- `npm run dev`: Starts the Vite development server.
- `npm run build`: Builds the production-ready frontend.
- `npm run lint`: Runs ESLint for code quality checks.
- `npm run preview`: Previews the production build locally.
- `npm run generate:types`: Generates TypeScript types from the backend Swagger schema.

---

## API Documentation

Once the backend is running, you can access the interactive Swagger documentation at:
**[http://localhost:4000/api-docs](http://localhost:4000/api-docs)**

(Note: If running via Docker, ensure the port matches your configuration).

---

## Automated Services

### Daily Email/System Reminders
A cron-job script (`src/services/reminderService.ts`) runs once daily at **8:00 AM**.
- It scans the **Billing** table.
- Finds any unpaid bills expiring in exactly 3 days and sends reminders.
- Marks bills as `overdue` when the `dueDate` passes.

---

## Debugging Guide

1.  **Database Connection Issues**:
    - Ensure MySQL service is running.
    - Check if the database name in `.env` matches your MySQL instance.
    - Verify `DB_USER` and `DB_PASSWORD`.
2.  **Authentication (401 Errors)**:
    - Ensure you are sending the `Authorization: Bearer <token>` header.
    - Check if the token has expired.
3.  **Sequelize Sync**:
    - The backend uses `sequelize.sync({ alter: true })` in development to automatically update the schema. In production, it defaults to a safe sync. Check `DB_SYNC_ALTER` env var.
4.  **SQL Logging**:
    - To see raw SQL queries, change `logging: false` to `logging: console.log` in `src/config/database.ts`.

---

## TODOs & Future Improvements

- [ ] **Tests**: Implement unit and integration tests for both backend (Jest/Supertest) and frontend (Vitest/React Testing Library).
- [ ] **Migrations**: Transition from `sequelize.sync` to a robust migration system (Sequelize CLI).
- [ ] **File Storage**: Add support for uploading item images.
- [ ] **Logging**: Improve production logging with a centralized logging service.

---

## License

This project is licensed under the **Apache License 2.0**. See the [LICENSE](LICENSE) file for details.


