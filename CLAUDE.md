# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Backend (`rental-management-backend/`)
- **Development**: `npm run dev` (starts server with nodemon and ts-node)
- **Build**: `npm run build` (compiles TS to JS in `dist/`)
- **Start (Production)**: `npm start` (runs compiled JS)
- **Tests**: `npm test` (runs Jest)
- **Swagger Export**: `npm run export:swagger` (generates `swagger.json`)

### Frontend (`rental-management-frontend/`)
- **Development**: `npm run dev` (starts Vite dev server)
- **Build**: `npm run build` (builds production assets)
- **Lint**: `npm run lint`
- **Tests**: `npm run test` (runs Vitest)
- **Generate Types**: `npm run generate:types` (generates TS types from backend `swagger.json`)

### Full Stack
- **Docker**: `docker-compose up --build` (starts DB, Backend, and Frontend)

---

## Architecture & Structure

### Overview
The project is a full-stack Rental Management System using a Node.js/Express backend and a React frontend.

### Backend Architecture (`rental-management-backend/`)
- **API Style**: REST
- **Database**: PostgreSQL (via Sequelize ORM)
- **Key Layers**:
    - `src/models/`: Sequelize models defining the schema (User, Item, Customer, Rental, Billing).
    - `src/controllers/`: Request handlers managing the flow of data.
    - `src/routes/`: API route definitions.
    - `src/services/`: Business logic, including `reminderService.ts` (daily cron jobs for payment reminders and overdue tracking).
    - `src/utils/`: Shared utilities, including PDF generation (`pdfUtils.ts`) and billing calculations.
- **Auth**: JWT-based authentication with roles (admin/manager).
- **Automated Billing**: Implements specific rules for partial month charging based on the day of return (before 5th: 0%, 5th-15th: 50%, after 15th: 100%).

### Frontend Architecture (`rental-management-frontend/`)
- **Framework**: React 19 with Vite.
- **State Management**: Redux Toolkit with RTK Query for server state and caching.
- **Styling**: Tailwind CSS and Shadcn/UI.
- **API Integration**: Axios client in `src/api/`, with types generated from the backend's Swagger schema.
- **Routing**: React Router.

---

## Active Feature Development

The following three features are currently being implemented. Claude Code must follow
these specifications precisely. Always read the existing codebase before making any
changes — never assume structure, naming, or patterns.

---

### FEATURE 1: Outstanding Quantity on Rental Page

**Goal:** Display how many units are still out on rent (not yet returned) for each
rental record on the Rental Page.

**Rules:**
- Before writing any code, read the Rental Sequelize model, the rentals controller,
  and the Rental Page component to understand the existing data shape.
- Compute `outstandingQty` in SQL/Sequelize (not in JavaScript) using the actual
  schema discovered — e.g. `total_rented_qty - total_returned_qty` or via a subquery
  against a returns table if one exists.
- Update the GET rentals list endpoint to include `outstandingQty` in every record.
- Update the RTK Query rentals slice to reflect the new field in the response type.
- On the Rental Page table, add an **"Outstanding Qty"** column next to the total
  quantity column. Render the value using a ShadCN `Badge`:
  - `variant="destructive"` (red) when `outstandingQty > 0`
  - `variant="secondary"` (muted) when `outstandingQty === 0`

---

### FEATURE 2: Inventory Quantity Sync on All Rental Events

**Goal:** The available quantity on the Items/Inventory page must stay in sync with
every rental event — new rental, quantity addition, rental extension, and item return.

**Rules:**
- Before writing any code, read the Item model, the rentals controller, and any
  existing return-handling logic to understand where mutations happen.
- Every operation that touches both the `rentals` (or `rental_items`) table and the
  `items` table **must be wrapped in a PostgreSQL/Sequelize transaction**.
- Apply the following inventory adjustments per event:

  | Event | Inventory Change |
  |---|---|
  | New rental created | Decrease item qty by rented qty |
  | Qty added to existing rental | Decrease item qty by added qty |
  | Rental extended (date only) | No inventory change |
  | Items returned | Increase item qty by returned qty |

- If any operation would cause an item's available quantity to drop below `0`,
  reject it immediately with HTTP `400` and the message:
  `"Insufficient stock for item: [item name]"`
- After every rental mutation (create, update qty, return), invalidate **both**
  the rentals cache tag **and** the items/inventory cache tag in RTK Query.
- Discover the exact RTK Query tag names already used in the codebase and reuse
  them — do not invent new tag names.

---

### FEATURE 3: Address Field in Create Rental Dialog

**Goal:** Allow users to optionally enter a site or delivery address when creating
a new rental via the existing ShadCN Dialog modal.

**Rules:**
- Before writing any code, read the Rental Sequelize model, the POST /rentals
  controller, and the Create Rental Dialog component.
- **Migration**: Add an `address` column (`TEXT`, nullable, no default) to the
  rentals table. Write this as a new migration file — do not modify the model
  file directly without a corresponding migration.
- **Backend**: Update POST /rentals to accept and persist `address`. Update GET
  /rentals and GET /rentals/:id to return `address` in the response.
- **RTK Query**: Include `address` in the `createRental` mutation payload and in
  the rental response type.
- **UI — Create Rental Dialog**:
  - Add a ShadCN `Textarea` for address below the customer/party name field.
  - Label: `"Address"` | Placeholder: `"Enter site or delivery address (optional)"`
  - Field is optional — no required validation.
  - Wire into the existing form state pattern (match whatever is already used:
    React Hook Form, `useState`, etc.).
- **UI — Display**:
  - If a rental detail view or expanded row exists → show address there.
  - If the table has no detail view → show address in a ShadCN `Tooltip` or
    `Popover` on the row, triggered by a `lucide-react` `Info` icon.
  - If address is `null` or empty → render nothing.

---

## General Coding Rules (apply to all work in this repo)

- **Read before writing**: Always inspect the actual file before editing it.
  Never guess at existing structure, column names, or naming conventions.
- **Match existing patterns**: Follow the conventions already present in the
  codebase — folder structure, naming, error handling style, and form patterns.
- **Transactions**: Any operation that writes to more than one table (especially
  rentals + items) must use a Sequelize-managed transaction with proper rollback.
- **Cache invalidation**: After every RTK Query mutation, invalidate all affected
  cache tags so UI reflects the latest state without a manual reload.
- **Type safety**: If TypeScript types exist (generated or manual), update them
  to reflect new fields. Re-run `npm run generate:types` after any Swagger change.
- **Do not break existing functionality**: Rentals, billing, PDF generation, auth,
  and cron jobs must continue to work after any change.
- **After completing changes**: List every file modified with a one-line description
  of what changed in each.