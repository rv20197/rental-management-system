# Goods Rental Management Frontend

A React application for managing a goods/equipment rental business. Built with React 19, Vite, TypeScript, and Tailwind CSS.

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Prerequisites](#prerequisites)
4. [Setup & Installation](#setup--installation)
5. [Environment Variables](#environment-variables)
6. [Scripts](#scripts)
7. [Billing Logic Mirror](#billing-logic-mirror)

---

## Features

- **Dashboard**: High-level overview of rentals, inventory, and revenue.
- **Inventory Management**: Add, update, and track status of rental goods.
- **Customer Tracking**: Maintain customer profiles and rental history.
- **Rental Processing**: Create new rentals and process returns.
- **Billing & Payments**: View billing status, mark payments, and download invoices.
- **Interactive Returns**: Real-time estimation of billing amounts during return processing.

---

## Tech Stack

- **Framework**: React 19
- **Build Tool**: Vite
- **Language**: TypeScript
- **State Management**: Redux Toolkit (RTK Query)
- **Routing**: React Router
- **Styling**: Tailwind CSS & Shadcn/UI
- **Forms**: React Hook Form & Zod
- **API Client**: Axios

---

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) (v9 or higher)

---

## Setup & Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Create a `.env` file in the `rental-management-frontend` directory.

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   - Default URL: `http://localhost:5173`

---

## Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_API_URL` | The full URL of the backend API | `http://localhost:4000` |

---

## Scripts

- `npm run dev`: Starts the Vite development server.
- `npm run build`: Compiles the application for production.
- `npm run lint`: Runs ESLint for code quality checks.
- `npm run preview`: Previews the production build locally.
- `npm run generate:types`: Pulls the latest Swagger schema from the backend and generates TypeScript types.

---

## Billing Logic Mirror

The frontend contains a client-side implementation of the billing logic (`src/lib/billingUtils.ts`) that exactly mirrors the backend's calculation rules. This allows the UI to provide **real-time billing estimations** to the user during the return process before the final submission to the backend.

**Rules:**
- Before the 5th: 0 charge for the month.
- 5th to 15th: 0.5 months charge.
- After the 15th: 1.0 month charge.
