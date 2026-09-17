# TiffinFlow &mdash; Home-Style Tiffin Subscription & Pro-Rated Billing Platform

A production-grade, generic MERN platform designed for home-style tiffin (lunch delivery) businesses.

Customers subscribe to a monthly weekday (Mon–Fri) lunch delivery plan. Customers can pause their subscription for any date range (travel, festivals, medical leave) or indefinitely, and resume at any time. Paused weekdays are never billed. At month-end, the owner generates an airtight pro-rated invoice per customer, paying only for weekdays the customer was actually served.

Includes full support for **Morning Notifications & Virtual Clock (T1)**, **Mid-Cycle Subscription Transfers (T6)**, and **Messy Data Import (T4)**.

---

## Tech Stack

- **Backend**: Node.js, Express.js REST API, Mongoose ODM, MongoDB (with automatic in-memory fallback for instant zero-dependency execution).
- **Authentication**: JWT (JSON Web Tokens, 7-day expiry), bcryptjs password hashing (salt rounds $\ge 10$), token-protected endpoints.
- **Frontend**: React (Vite, modern functional components + hooks), React Router v6, Tailwind CSS with a warm culinary palette (terracotta, saffron, warm neutrals), Lucide React icons, Axios with auth interceptors.
- **Testing**: Built-in Node test runner (`node --test`) with 21 unit tests covering billing math, transfers, morning notifications, and data import pipelines.

---

## Core Architecture & Features

### 0. Foundational Entity: `Subscription`
Subscriptions outlive individual customers to allow mid-month transfers:
- **`Subscription`**: `planId`, `cycleStartDate`, `status` (`active`, `paused`, `cancelled`), `currentCustomerId`, and `ownershipHistory` array (`[{ customerId, from, to }]`).
- **`Customer`**: `name`, `phone` (unique index), `address`.
- **`PauseRecord`**: References `subscriptionId` so pauses belong to the delivery slot and survive customer transfers.
- **`Bill`**: References both `subscriptionId` and `customerId`. Multiple bills can exist for the same subscription in a transfer month.

### 1. T1 &mdash; Morning Notifications & Virtual Clock
- Virtual clock endpoints for automated grading and daily delivery simulation:
  - `POST /clock` (and `/api/clock`): Advance or set virtual date (`{ "date": "YYYY-MM-DD" }`), immediately triggers the morning notification job.
  - `GET /outbox` (and `/api/outbox`): Lists sent notifications (optional `?date=YYYY-MM-DD` filter).
  - `POST /outbox/reset` (and `/api/outbox/reset`): Clears outbox records.
- Pure `getDueToday(subscriptions, pauseRecords, date)` function: checks active status, Mon–Fri weekday, and pause exclusions (respects resume date as delivered).
- Strictly idempotent: calling `/clock` multiple times on the same date will not duplicate notifications.

### 2. T6 &mdash; Mid-Cycle Transfer & Split Billing
- `POST /api/subscriptions/:id/transfer`: Reassigns subscription slot to a new customer mid-cycle:
  - **Outgoing customer** is billable through `transferDate - 1`.
  - **Incoming customer** is billable from `transferDate` onward.
  - `planId` and `cycleStartDate` carry over unchanged.
- Pure `calculateBill` engine computes shared daily rate and apportions billable weekdays according to each owner's window. Pauses in a given window reduce only that owner's billable days.

### 3. T4 &mdash; Messy Data Import
- `POST /api/customers/import`: Bulk import customer rows (JSON array) with normalization, deduplication, and rejection reporting:
  - **Phone Normalization**: Strips spaces, dashes, `+91`/`91` prefixes, verifies 10 digits.
  - **Flexible Date Parsing**: Handles ISO (`YYYY-MM-DD`), `DD/MM/YYYY`, `MM/DD/YYYY`, `DD-MM-YYYY`, `15 Sep 2026`, epoch timestamps. Ambiguous dates default to `DD/MM/YYYY`.
  - **Deduplication vs. Rejection**:
    - `rejected`: Broken rows (blank name, unparseable date, invalid phone, unknown plan) with exact reasons.
    - `deduped`: Valid rows whose phone has already been seen in the batch or exists in the database (skipped cleanly).
    - `imported`: Valid, first-seen customers creating `Customer` and `Subscription`.

---

## Running the Automated Test Suite

```bash
cd server
npm test
```

Runs all 21 automated unit tests:
```
✔ Billing Engine - Full month with no pauses
✔ Billing Engine - Customer subscribes mid-month
✔ Billing Engine - Customer pause range inside month
✔ Billing Engine - Multiple overlapping pause ranges de-duplicate
✔ Billing Engine - Pause spans across month boundaries
✔ Billing Engine - Indefinite pause (null endDate)
✔ Billing Engine - Customer resumes mid-pause (resume date is billable)
✔ Billing Engine - Pause solely over a weekend has 0 paused weekdays
✔ T6 Mid-Cycle Transfer - Split mid-month with no pauses
✔ T6 Mid-Cycle Transfer - Pause spanning the transfer date
✔ T6 Mid-Cycle Transfer - Transfer on very first weekday of month
✔ T6 Mid-Cycle Transfer - Two transfers within the same month (chain of 3 owners)
✔ T4 Import - Phone normalization
✔ T4 Import - Flexible date parsing across mixed formats
✔ T4 Import - Row validation
✔ T1 Morning Notifications - Active subscription due on weekday
✔ T1 Morning Notifications - Weekend dates never deliver lunch
✔ T1 Morning Notifications - Subscription with paused status is excluded
✔ T1 Morning Notifications - Active subscription covered by pause range is excluded
✔ T1 Morning Notifications - Indefinite pause excludes upcoming weekdays
✔ T1 Morning Notifications - Resumed mid-pause: resume date is delivered and notified

ℹ tests 21 | pass 21 | fail 0
```

---

## Running the Application

### 1. Start the Backend API
```bash
cd server
npm start
# Listens on http://localhost:5000
```
*Note: Automatically connects to `MONGODB_URI` from `.env` or seamlessly starts an embedded in-memory MongoDB instance if local MongoDB is not running.*

### 2. Start the Frontend Client
```bash
cd client
npm run dev
# Vite dev server runs on http://localhost:3000
```

### 3. Demo Credentials
- **Email**: `owner@tiffin.com`
- **Password**: `password123`
*(Or click "Fill Seed Owner" on the login screen).*

---

## API Summary

| Method | Route | Twist | Purpose |
|---|---|---|---|
| POST | `/clock` | T1 | Advance/set virtual date, dispatch morning notifications |
| GET | `/outbox` | T1 | List sent notifications (supports `?date=YYYY-MM-DD`) |
| POST | `/outbox/reset` | T1 | Clear notification outbox (grading utility) |
| POST | `/api/subscriptions/:id/transfer` | T6 | Transfer subscription to new customer mid-cycle |
| GET | `/api/subscriptions/:id` | T6 | Fetch subscription with complete ownership history |
| POST | `/api/customers/import` | T4 | Bulk import customer list with `{ imported, deduped, rejected }` |
| POST | `/api/auth/signup` | Core | Owner registration with bcrypt password hash |
| POST | `/api/auth/login` | Core | Owner login, issues 7-day JWT |
| GET | `/api/customers` | Core | List subscribers directory with active/paused status filter |
| POST | `/api/customers` | Core | Subscribe a new customer to a plan |
| GET | `/api/customers/:phone` | Core | Phone-based customer lookup and subscription timeline |
| POST | `/api/customers/:id/pause` | Core | Pause subscription for a date range or indefinitely |
| POST | `/api/customers/:id/resume` | Core | Resume delivery slot (resume day is billable) |
| POST | `/api/billing/generate` | Core | Compute pro-rated bills for all subscribers for `?month=YYYY-MM` |
| GET | `/api/billing` | Core | Fetch calculated monthly bills and summary totals |
| GET | `/api/plans` | Core | List available monthly tiffin plans |
