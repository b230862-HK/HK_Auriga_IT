# TiffinFlow &mdash; Home-Style Tiffin Subscription & Pro-Rated Billing Platform

A production-grade, generic MERN platform designed for home-style tiffin (lunch delivery) businesses.

Customers subscribe to a monthly weekday (Mon–Fri) lunch delivery plan. Customers can pause their subscription for any date range (travel, festivals, medical leave) or indefinitely, and resume at any time. Paused weekdays are never billed. At month-end, the owner generates an airtight pro-rated invoice per customer, paying only for weekdays the customer was actually served.

---

## Tech Stack

- **Backend**: Node.js, Express.js REST API, Mongoose ODM, MongoDB (with automatic in-memory fallback for instant zero-dependency testing).
- **Authentication**: JWT (JSON Web Tokens, 7-day expiry), bcryptjs password hashing (salt rounds $\ge 10$), token-protected endpoints.
- **Frontend**: React (Vite, modern functional components + hooks), React Router v6, Tailwind CSS with a warm culinary palette (terracotta, saffron, warm neutrals), Lucide React icons, Axios with auth interceptors.
- **Testing**: Built-in Node test runner (`node --test`) for pure billing calculation unit tests covering all edge cases.

---

## Core Billing Engine Logic

The billing calculation logic is isolated in a pure, framework-agnostic module (`server/src/utils/billing.js`) and `server/src/utils/dateUtils.js`.

For any customer, plan, pause records, and billing month ($YYYY-MM$):
1. **Calendar Weekdays**: Count of Mon–Fri dates in the calendar month.
2. **Base Daily Rate**:
   $$\text{dailyRate} = \frac{\text{planPrice}}{\text{calendarWeekdays}}$$
3. **Customer Subscription Start Constraint**:
   - If customer subscribes mid-month, candidate weekdays count strictly from $\max(\text{monthStart}, \text{subscriptionStartDate})$ to $\text{monthEnd}$.
   - Weekdays prior to subscription are never counted in `totalWeekdays` or `billableDays`.
4. **Pause Deductions with De-Duplication**:
   - Date ranges for all pause records are converted into a `Set` of unique `YYYY-MM-DD` weekday strings.
   - Overlapping pause ranges automatically de-duplicate.
   - Cross-month pauses only deduct weekdays falling inside the active billing month.
   - Indefinite pauses (`endDate: null`) deduct weekdays through the billing period.
   - **Resume Day Handling**: When a customer resumes mid-pause, the resume date itself counts as a delivered/billable day (excluded from pause deductions).
5. **Final Pro-Rated Amount**:
   $$\text{billableDays} = \max(0, \text{customerTotalWeekdays} - \text{pausedWeekdays})$$
   $$\text{finalBill} = \text{round}(\text{dailyRate} \times \text{billableDays}, 2)$$

---

## Project Structure

```
Auriga_IT/
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                 # MongoDB connection + MongoMemoryServer fallback
│   │   ├── models/
│   │   │   ├── Owner.js              # Owner schema with bcrypt password hashing
│   │   │   ├── Plan.js               # Tiffin subscription plan schema
│   │   │   ├── Customer.js           # Customer schema with indexed phone & status
│   │   │   ├── PauseRecord.js        # Pause schedule with date range & reason
│   │   │   └── Bill.js               # Pro-rated bill record with itemized audit trail
│   │   ├── middleware/
│   │   │   ├── auth.js               # JWT verification middleware & token generator
│   │   │   └── errorHandler.js       # Centralized JSON error handler (400, 404, 409, 500)
│   │   ├── utils/
│   │   │   ├── billing.js            # Pure framework-agnostic pro-rated billing engine
│   │   │   └── dateUtils.js          # UTC calendar weekday helpers
│   │   ├── controllers/
│   │   │   ├── authController.js     # Signup, login, and me
│   │   │   ├── customerController.js # Subscribe, phone lookup, status list, pause/resume
│   │   │   ├── planController.js     # List and create plans
│   │   │   └── billingController.js  # Batch generate bills, customer invoice breakdown
│   │   ├── routes/                   # Express route definitions
│   │   ├── seed.js                   # Auto-seed sample plans, demo owner, & realistic data
│   │   └── index.js                  # Express application entry point
│   ├── test/
│   │   └── billing.test.js           # Unit test suite for billing edge cases
│   ├── package.json
│   └── .env
├── client/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.js             # Axios instance with Bearer token interceptor
│   │   │   └── services.js           # API services for auth, customers, plans, billing
│   │   ├── context/
│   │   │   └── AuthContext.jsx       # Owner session state, login/logout, toasts
│   │   ├── components/
│   │   │   ├── Navbar.jsx            # Top navbar with branding & navigation
│   │   │   ├── ProtectedRoute.jsx    # Auth route guard
│   │   │   ├── StatCard.jsx          # Reusable summary metric card
│   │   │   ├── PauseModal.jsx        # Interactive pause/resume date picker modal
│   │   │   └── Toast.jsx             # Toast notification alerts
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx         # Branded owner login with demo credentials
│   │   │   ├── SignupPage.jsx        # Owner kitchen registration
│   │   │   ├── DashboardPage.jsx     # Live stats & Active/Paused customer tables
│   │   │   ├── SubscribePage.jsx     # Customer onboarding & plan picker
│   │   │   ├── CustomerSearchPage.jsx# Phone lookup, pause timeline & live preview
│   │   │   └── BillingPage.jsx       # Month selector, generate bills, audit breakdown
│   │   ├── App.jsx                   # Route hierarchy
│   │   ├── main.jsx
│   │   └── index.css                 # Tailwind layers & typography
│   ├── tailwind.config.js            # Custom terracotta/saffron/warm palette
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended; developed on Node v24)
- npm

### 1. Running the Server

```bash
cd server
npm install
npm run dev
```

*Note on Database:* The server reads `MONGODB_URI` from `.env`. If a local or remote MongoDB instance is running, it connects automatically. If no external MongoDB daemon is active on port 27017, the server seamlessly initializes an embedded `MongoMemoryServer` instance and seeds sample plans, demo owner, and customer data.

### 2. Running Billing Unit Tests

```bash
cd server
npm test
```
Runs the 8 automated billing calculation test cases:
- Full month with no pauses
- Customer subscribing mid-month
- Partial month pause inside month
- Multiple overlapping pause ranges de-duplicating
- Pause spanning across calendar month boundaries
- Indefinite pause (`endDate: null`)
- Customer resuming mid-pause (resume date billable)
- Pauses solely over weekends

### 3. Running the Frontend Client

```bash
cd client
npm install
npm run dev
```
Open **http://localhost:3000** in your browser.

---

## Demo Credentials

The application automatically seeds a demo owner account on first run:
- **Email**: `owner@tiffin.com`
- **Password**: `password123`
- *(A one-click "Fill Seed Owner" button is also provided on the login screen).*

---

## API Reference

### Authentication
- `POST /api/auth/signup` &mdash; Create owner account (hashes password with bcrypt, returns JWT).
- `POST /api/auth/login` &mdash; Authenticate owner and receive 7-day JWT.
- `GET /api/auth/me` &mdash; Fetch authenticated owner profile *(Protected)*.

### Customers
- `POST /api/customers` &mdash; Subscribe new customer with plan assignment and unique phone *(Protected)*.
- `GET /api/customers/:phone` &mdash; Lookup customer by phone number, including active status and pause history *(Protected)*.
- `GET /api/customers?status=active|paused` &mdash; List customers filtered by status *(Protected)*.
- `POST /api/customers/:id/pause` &mdash; Add pause record (`startDate`, `endDate`, `reason`) *(Protected)*.
- `POST /api/customers/:id/resume` &mdash; Close out active pause and restore status to active *(Protected)*.
- `GET /api/customers/:id/pauses` &mdash; List customer pause history *(Protected)*.

### Plans
- `GET /api/plans` &mdash; List available subscription plans *(Protected)*.
- `POST /api/plans` &mdash; Create a subscription plan *(Protected)*.

### Billing
- `POST /api/billing/generate?month=YYYY-MM` &mdash; Batch calculate and upsert pro-rated bills for all subscribers for a given month *(Protected)*.
- `GET /api/billing?month=YYYY-MM` &mdash; Fetch all generated bills for a month *(Protected)*.
- `GET /api/billing/:customerId?month=YYYY-MM` &mdash; Fetch a specific customer's bill with audit trail *(Protected)*.
