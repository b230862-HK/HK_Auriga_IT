# Reasoning Behind the Solution

## 1. Understanding the Problem

The project began as a home-style tiffin subscription and pro-rated billing platform. The central business rule is:

> A customer should be billed only for the days on which they were actually served.

The original workflow was:

```text
Subscribe → Pause / Resume → Pro-Rated Billing → Lookup / Dashboard
```

The project was later extended with a decoupled `Subscription` entity and three graded twists:

- **T1 — Morning Notifications**
- **T6 — Mid-Cycle Transfer**
- **T4 — Messy Data Import**

The extensions preserve the same principle: business rules should be explicit, deterministic, and independently testable.

---

## 2. Why the Subscription Model Was Refactored

A delivery subscription can outlive an individual customer. This becomes important when a customer transfers a delivery slot during an active billing cycle.

For example:

```text
Delivery Slot
├── Customer A: September 1 → September 17
└── Customer B: September 18 → onward
```

If subscription information remained embedded in Customer A, transferring the slot could overwrite historical information needed for billing.

The solution therefore introduced a separate `Subscription` model containing:

```text
planId
cycleStartDate
status
currentCustomerId
ownershipHistory
```

`ownershipHistory` records which customer owned the subscription during each period. This preserves historical ownership while allowing the current owner to change.

---

## 3. Ownership History and Transfer Reasoning

Ownership is stored as date intervals:

```text
Customer A
from: September 1
to:   September 17

Customer B
from: September 18
to:   null
```

When a transfer occurs:

1. The outgoing ownership interval ends on the day before the transfer.
2. A new ownership interval begins on the transfer date.
3. `currentCustomerId` changes to the incoming customer.

This makes each weekday attributable to the correct owner unless the subscription is paused.

The transfer API also reuses an existing customer by phone when possible, otherwise it creates a new customer.

---

## 4. Core Billing Reasoning

Billing remains the most important business rule.

For each weekday in a billing month, the system determines:

```text
Who owns the subscription?
        ↓
Is the date paused?
        ↓
If not paused → count it as billable for that owner
```

The daily rate is:

```text
dailyRate = planPrice / calendarWeekdays
```

For transferred subscriptions, the same daily rate is applied to each owner's billable days.

The final amount is:

```text
finalAmount = round(dailyRate × billableDays, 2)
```

A key invariant is the **day conservation rule**:

> Total billable days across all owners must equal the non-paused billable days of the subscription.

This prevents transfers from creating or losing billable days.

---

## 5. Date Boundary Handling

Date calculations were treated as a major source of possible billing errors.

The billing engine uses UTC calendar-date calculations and handles:

- Monday-Friday delivery only
- Mid-month subscriptions
- Month-boundary pauses
- Indefinite pauses
- Overlapping pauses
- Resume dates
- Mid-cycle transfers

A customer subscribing during the month is only considered from the subscription start date onward.

A pause crossing a month boundary is clipped to the selected billing month.

---

## 6. Overlapping Pause Records

Multiple pause records can overlap.

For example:

```text
Pause A: 5th → 12th
Pause B: 10th → 18th
```

Counting each range independently would double-count the overlapping dates.

The implementation therefore converts paused dates into a `Set` of unique `YYYY-MM-DD` strings.

```text
Pause ranges
     ↓
Generate dates
     ↓
Set of unique dates
     ↓
Count only Monday-Friday
```

This ensures that each paused weekday is deducted exactly once.

---

## 7. Resume-Date Reasoning

The requirements specify that the resume date itself is billable.

Therefore, when a subscription resumes on date `R`, that date must not remain inside the paused interval.

The implementation closes the outgoing pause before the resume date / excludes the resume date from paused deductions.

This avoids an off-by-one billing error.

The same rule is also used by the notification system, so a customer who resumes on a weekday can receive a notification that day.

---

# 8. T1 — Morning Notifications

The project added a virtual clock so date-dependent notification behaviour can be tested deterministically.

The main pure function is:

```javascript
getDueToday(subscriptions, pauseRecords, dateStr)
```

A subscription is due for lunch when:

```text
Subscription is active
AND
Date is Monday-Friday
AND
Date is not covered by a pause
```

Weekends never produce lunch notifications.

Paused subscriptions are excluded.

An active subscription covered by a pause record is also excluded.

A resume date is treated as a delivery day.

---

## 9. Notification Outbox and Idempotency

Notifications are stored in a dedicated `Notification` collection with:

```text
subscriptionId
customerId
phone
date
message
sentAt
```

A unique compound index:

```text
{ subscriptionId: 1, date: 1 }
```

prevents duplicate notifications for the same subscription and date.

The workflow is:

```text
Set virtual date
      ↓
Find subscriptions due today
      ↓
Check existing notification
      ↓
Create only if absent
      ↓
Expose through /outbox
```

This makes repeated clock execution safe.

---

# 10. T6 — Mid-Cycle Transfer and Split Billing

The transfer feature allows:

```text
POST /api/subscriptions/:id/transfer
```

with an effective transfer date and incoming customer details.

The subscription ownership history is updated rather than replacing the subscription itself.

The billing engine then examines every weekday and matches it against `ownershipHistory`.

For every weekday:

```text
Ownership interval
        +
Pause status
        ↓
Delivered?
        ↓
Assign billable day to owner
```

The result can contain multiple bill rows for one subscription and one month.

For example:

```text
September 1 ───── September 17 | September 18 ───── September 30
          Customer A            |          Customer B
```

The combined billable days are conserved across both owners.

The implementation also handles:

- Transfer without pauses
- Transfer with a pause spanning the transfer date
- Transfer on the first weekday
- Multiple transfers in one month

---

# 11. T4 — Messy Data Import

Real-world customer data may contain inconsistent phone numbers, dates, missing fields, and duplicate records.

The solution therefore introduced a dedicated import pipeline:

```text
Raw Data
   ↓
Normalize Phone
   ↓
Parse Date
   ↓
Validate Row
   ↓
Detect Duplicates
   ↓
Imported / Deduped / Rejected
```

The main utility functions are:

```text
normalizePhone()
parseFlexibleDate()
validateRow()
processImportBatch()
```

Keeping these rules separate makes them easier to test.

---

## 12. Phone Normalization

The importer cleans common phone-number formatting such as:

```text
+91 9988776655
+91-9988776655
99887 76655
```

It extracts a valid 10-digit number where possible.

Invalid lengths are rejected.

This is especially important because phone numbers are used as the primary customer lookup key.

---

## 13. Flexible Date Parsing

The importer supports several formats, including:

```text
ISO
DD/MM/YYYY
MM/DD/YYYY
DD-MM-YYYY
D MMM YYYY
timestamps
```

For ambiguous dates such as:

```text
03/04/2026
```

the project uses `DD/MM/YYYY`.

Invalid dates such as:

```text
31/02/2026
```

are rejected.

---

## 14. Import Deduplication and Rejection Reporting

Import results are separated into:

```text
imported
deduped
rejected
```

Duplicates can occur:

- Within the same import batch
- Against an existing database customer

Rejected rows include specific diagnostic reasons, such as:

```text
Blank customer name
Short/invalid phone
Impossible date
Unknown subscription plan
```

This allows bad source data to be corrected instead of silently entering the system.

---

# 15. Automated Testing Strategy

As the application expanded, testing was expanded with it.

The tests now cover:

```text
Billing
Notifications
Messy Import
Transfers
```

The final automated test run was:

```text
21 tests
21 passed
0 failed
```

This includes the original billing edge cases plus the new graded requirements.

---

# 16. Billing Test Results

The billing tests successfully covered:

```text
✔ Full month with no pauses
✔ Mid-month subscription
✔ Pause inside month
✔ Overlapping pauses
✔ Pause crossing month boundaries
✔ Indefinite pause
✔ Resume during a pause
✔ Weekend-only pause
✔ Mid-cycle transfer
✔ Transfer with pause
✔ Transfer on first weekday
✔ Two transfers in one month
```

These tests verify the calculation at the business-rule level without requiring the entire application to run.

---

# 17. Notification Test Results

The notification tests covered:

```text
✔ Active subscription on a weekday
✔ Weekend dates
✔ Paused subscription
✔ Active subscription covered by pause
✔ Indefinite pause
✔ Resume date
✔ Notification idempotency
```

This verifies that delivery notifications follow the same weekday and pause rules as billing.

---

# 18. Import Test Results

The import tests covered:

```text
✔ Phone normalization
✔ +91 prefixes
✔ Spaces and formatting
✔ Invalid phone lengths
✔ Multiple date formats
✔ Invalid dates
✔ Required-field validation
✔ Duplicate rows
✔ Existing database customers
```

This verifies both clean and messy input scenarios.

---

# 19. Live Integration Verification

After the unit tests passed, the application was verified through live API integration.

The verification covered:

```text
Virtual Clock
      ↓
Morning Notifications
      ↓
Subscription Transfer
      ↓
Split Billing
      ↓
Messy Data Import
```

### Notifications

The virtual clock was set to:

```text
2026-09-16
```

Six notifications were dispatched to active weekday subscribers.

The `/outbox` endpoint returned the notifications with personalized greetings.

Running the same date again produced:

```text
notifiedCount: 0
```

which verified idempotency.

### Mid-Cycle Transfer

A subscription was transferred to **Gaurav Sen** effective:

```text
2026-09-18
```

The ownership history showed:

```text
Outgoing owner → closed on 2026-09-17
Incoming owner → active from 2026-09-18
```

September billing produced two bill line items whose combined weekday count was exactly:

```text
22 weekdays
```

### Messy Import

An eight-row import was tested:

```text
Imported: 2
Deduped:  2
Rejected: 4
```

The rejected records produced exact reasons for:

```text
Blank customer name
Short/invalid phone
Impossible date (31/02/2026)
Unknown subscription plan
```

---

# 20. Debugging and Issue Handling

The project follows a layered debugging approach:

```text
Business rule
      ↓
Pure utility
      ↓
Unit test
      ↓
API integration
      ↓
Frontend
```

A billing issue can therefore be isolated in the pure billing function before investigating the API or UI.

For billing, useful intermediate values include:

```text
calendar weekdays
ownership interval
paused dates
billable days
daily rate
final amount
```

For imports, the exact rejection reason identifies whether the problem is related to:

```text
phone
date
required fields
plan lookup
duplicate detection
```

This approach avoids debugging only from a final visible error.

---

# 21. Browser Automation Limitation

A browser-automation attempt was not successful because the Playwright driver could not be downloaded. The recorded failure was a `404 Not Found` while installing the Windows Playwright driver.

Therefore, browser automation was not represented as a successful test.

The project instead has successful:

- Unit-test verification
- Backend/API integration verification
- Notification verification
- Transfer and split-billing verification
- Messy-import verification

This distinction keeps the documentation accurate: backend and integration tests verify application behaviour, but they do not prove that every visual browser interaction was automatically tested.

---

# 22. Frontend Reasoning

The frontend was extended to expose the new workflows without moving business calculations into React.

### Customer Search

Added:

- Transfer Subscription action
- Ownership timeline
- Previous/current owner information

### Dashboard

Added:

- Bulk Import action
- Transfer indicators

### Billing

Added:

- Split-bill indicators
- Transferred-slot badges
- Per-owner audit information

### Import

Added an interactive import modal containing:

- JSON input
- Sample messy data
- Import action
- Result summary
- Rejected-row diagnostics

---

# 23. Overall Architecture

The project keeps business logic separated into focused modules:

```text
billing.js
    → billing calculations

notificationUtils.js
    → notification eligibility

importUtils.js
    → data normalization and validation

Subscription.js
    → delivery-slot ownership history
```

This allows the application to grow without putting all business rules into one controller or frontend component.

The architecture now supports:

```text
Customer Management
+
Subscription Ownership
+
Pause / Resume
+
Pro-Rated Billing
+
Split Billing
+
Morning Notifications
+
Messy Data Import
```

---

# 24. Final Solution Flow

The evolved system can be viewed as:

```text
                    OWNER
                      │
                      ▼
                Authentication
                      │
                      ▼
              Customer Management
                      │
                      ▼
                Subscription
                      │
          ┌───────────┼───────────┐
          │           │           │
          ▼           ▼           ▼
      Pause/Resume  Transfer   Import Data
          │           │           │
          │     Ownership History  │
          │           │       Normalize / Validate
          └───────────┼───────────┘
                      ▼
               Daily Subscription State
                      │
             ┌────────┴────────┐
             ▼                 ▼
        Notifications       Billing
             │                 │
             ▼                 ▼
           Outbox        Pro-Rated / Split Bills
                               │
                               ▼
                         Owner Dashboard
```

---

# 25. Overall Reasoning

The solution evolved from a simple monthly tiffin billing problem into a more realistic subscription-management platform.

The central principle remained:

> **Track the actual state of a delivery subscription first, then derive operational actions and billing from that state.**

The subscription model preserves ownership history. Pause records preserve service interruptions. The billing engine converts these records into billable days. The notification system determines daily delivery eligibility. The import pipeline protects the database from inconsistent external data.

The complete chain is:

```text
Customer Data
     ↓
Subscription
     ↓
Ownership / Pause History
     ↓
Daily Delivery Eligibility
     ↓
Notifications
     ↓
Actual Service Days
     ↓
Monthly / Split Billing
     ↓
Auditable Dashboard
```

The final implementation is backed by **21 passing automated tests** covering the original billing requirements and the T1, T6, and T4 extensions, together with live integration verification for notifications, transfers, split billing, and messy imports.

The result is a generic tiffin-management platform where the important business rules are explicit, testable, and traceable from the original real-world problem to the final application.
