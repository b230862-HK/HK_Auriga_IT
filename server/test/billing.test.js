import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBill } from '../src/utils/billing.js';

// Month under test: September 2026 (22 calendar weekdays)
// Plan: 2200 per month (Daily rate = 100/day)
const testPlan = {
  _id: 'plan-1',
  name: 'Standard Veg Monthly',
  price: 2200
};

test('Billing Engine - Full month with no pauses', () => {
  const customer = {
    _id: 'cust-1',
    name: 'Rohan Sharma',
    subscriptionStartDate: '2026-08-01'
  };

  const bill = calculateBill({
    customer,
    plan: testPlan,
    pauseRecords: [],
    monthStr: '2026-09'
  });

  assert.equal(bill.totalWeekdays, 22);
  assert.equal(bill.pausedWeekdays, 0);
  assert.equal(bill.billableDays, 22);
  assert.equal(bill.dailyRate, 100);
  assert.equal(bill.finalAmount, 2200);
});

test('Billing Engine - Customer subscribes mid-month', () => {
  const customer = {
    _id: 'cust-2',
    name: 'Pooja Verma',
    subscriptionStartDate: '2026-09-16'
  };

  const bill = calculateBill({
    customer,
    plan: testPlan,
    pauseRecords: [],
    monthStr: '2026-09'
  });

  assert.equal(bill.totalWeekdays, 11);
  assert.equal(bill.pausedWeekdays, 0);
  assert.equal(bill.billableDays, 11);
  assert.equal(bill.dailyRate, 100);
  assert.equal(bill.finalAmount, 1100);
});

test('Billing Engine - Customer pause range inside month', () => {
  const customer = {
    _id: 'cust-3',
    name: 'Amit Patel',
    subscriptionStartDate: '2026-01-01'
  };

  const pauseRecords = [
    {
      startDate: '2026-09-07',
      endDate: '2026-09-11',
      reason: 'Out of station'
    }
  ];

  const bill = calculateBill({
    customer,
    plan: testPlan,
    pauseRecords,
    monthStr: '2026-09'
  });

  assert.equal(bill.totalWeekdays, 22);
  assert.equal(bill.pausedWeekdays, 5);
  assert.equal(bill.billableDays, 17);
  assert.equal(bill.finalAmount, 1700);
});

test('Billing Engine - Multiple overlapping pause ranges de-duplicate', () => {
  const customer = {
    _id: 'cust-4',
    name: 'Sneha Rao',
    subscriptionStartDate: '2026-01-01'
  };

  const pauseRecords = [
    {
      startDate: '2026-09-07',
      endDate: '2026-09-11',
      reason: 'Travel part 1'
    },
    {
      startDate: '2026-09-09',
      endDate: '2026-09-15',
      reason: 'Travel part 2'
    }
  ];

  const bill = calculateBill({
    customer,
    plan: testPlan,
    pauseRecords,
    monthStr: '2026-09'
  });

  assert.equal(bill.totalWeekdays, 22);
  assert.equal(bill.pausedWeekdays, 7);
  assert.equal(bill.billableDays, 15);
  assert.equal(bill.finalAmount, 1500);
});

test('Billing Engine - Pause spans across month boundaries', () => {
  const customer = {
    _id: 'cust-5',
    name: 'Vikram Mehta',
    subscriptionStartDate: '2026-01-01'
  };

  const pauseRecords = [
    {
      startDate: '2026-08-28',
      endDate: '2026-09-04',
      reason: 'Festival trip'
    }
  ];

  const bill = calculateBill({
    customer,
    plan: testPlan,
    pauseRecords,
    monthStr: '2026-09'
  });

  assert.equal(bill.totalWeekdays, 22);
  assert.equal(bill.pausedWeekdays, 4);
  assert.equal(bill.billableDays, 18);
  assert.equal(bill.finalAmount, 1800);
});

test('Billing Engine - Indefinite pause (null endDate)', () => {
  const customer = {
    _id: 'cust-6',
    name: 'Karan Singh',
    subscriptionStartDate: '2026-01-01'
  };

  const pauseRecords = [
    {
      startDate: '2026-09-21',
      endDate: null,
      reason: 'Indefinite medical leave'
    }
  ];

  const bill = calculateBill({
    customer,
    plan: testPlan,
    pauseRecords,
    monthStr: '2026-09'
  });

  assert.equal(bill.totalWeekdays, 22);
  assert.equal(bill.pausedWeekdays, 8);
  assert.equal(bill.billableDays, 14);
  assert.equal(bill.finalAmount, 1400);
});

test('Billing Engine - Customer resumes mid-pause (resume date is billable)', () => {
  const customer = {
    _id: 'cust-7',
    name: 'Ananya Gupta',
    subscriptionStartDate: '2026-01-01'
  };

  const pauseRecords = [
    {
      startDate: '2026-09-07',
      endDate: '2026-09-10',
      isResumed: true,
      resumedAt: '2026-09-10',
      reason: 'Work trip shortened'
    }
  ];

  const bill = calculateBill({
    customer,
    plan: testPlan,
    pauseRecords,
    monthStr: '2026-09'
  });

  assert.equal(bill.totalWeekdays, 22);
  assert.equal(bill.pausedWeekdays, 3);
  assert.equal(bill.billableDays, 19);
  assert.equal(bill.finalAmount, 1900);
  assert.ok(bill.details.billableDates.includes('2026-09-10'));
});

test('Billing Engine - Pause solely over a weekend has 0 paused weekdays', () => {
  const customer = {
    _id: 'cust-8',
    name: 'Rahul Joshi',
    subscriptionStartDate: '2026-01-01'
  };

  const pauseRecords = [
    {
      startDate: '2026-09-12',
      endDate: '2026-09-13',
      reason: 'Weekend getaway'
    }
  ];

  const bill = calculateBill({
    customer,
    plan: testPlan,
    pauseRecords,
    monthStr: '2026-09'
  });

  assert.equal(bill.totalWeekdays, 22);
  assert.equal(bill.pausedWeekdays, 0);
  assert.equal(bill.billableDays, 22);
  assert.equal(bill.finalAmount, 2200);
});

// ==========================================
// T6: MID-CYCLE TRANSFER UNIT TESTS
// ==========================================

test('T6 Mid-Cycle Transfer - Split mid-month with no pauses', () => {
  // Sep 2026 has 22 weekdays.
  // Transfer date: Sep 16, 2026 (Wednesday).
  // Customer A (outgoing) billable through Sep 15:
  //   Sep 1-4 (4) + Sep 7-11 (5) + Sep 14-15 (2) = 11 weekdays.
  // Customer B (incoming) billable from Sep 16 onward:
  //   Sep 16-18 (3) + Sep 21-25 (5) + Sep 28-30 (3) = 11 weekdays.
  const subscription = {
    _id: 'sub-transfer-1',
    planId: testPlan._id,
    cycleStartDate: '2026-01-01',
    ownershipHistory: [
      { customerId: 'cust-A', from: '2026-01-01', to: '2026-09-15' },
      { customerId: 'cust-B', from: '2026-09-16', to: null }
    ]
  };

  const result = calculateBill({
    subscription,
    plan: testPlan,
    pauseRecords: [],
    monthStr: '2026-09'
  });

  assert.equal(result.customerBills.length, 2);
  const billA = result.customerBills.find((b) => b.customerId === 'cust-A');
  const billB = result.customerBills.find((b) => b.customerId === 'cust-B');

  assert.ok(billA, 'Bill for Customer A should exist');
  assert.ok(billB, 'Bill for Customer B should exist');

  assert.equal(billA.billableDays, 11);
  assert.equal(billA.finalAmount, 1100);

  assert.equal(billB.billableDays, 11);
  assert.equal(billB.finalAmount, 1100);

  // Invariant check: sum equals single total
  assert.equal(billA.billableDays + billB.billableDays, 22);
  assert.equal(billA.finalAmount + billB.finalAmount, 2200);
});

test('T6 Mid-Cycle Transfer - Pause spanning the transfer date', () => {
  // Transfer date: Sep 16 (Wednesday).
  // Customer A window: Sep 1-15 (11 weekdays).
  // Customer B window: Sep 16-30 (11 weekdays).
  // Pause: Sep 14 (Mon) to Sep 17 (Thu) = 4 weekdays:
  //   Sep 14, 15 belong to Customer A.
  //   Sep 16, 17 belong to Customer B.
  const subscription = {
    _id: 'sub-transfer-2',
    planId: testPlan._id,
    cycleStartDate: '2026-01-01',
    ownershipHistory: [
      { customerId: 'cust-A', from: '2026-01-01', to: '2026-09-15' },
      { customerId: 'cust-B', from: '2026-09-16', to: null }
    ]
  };

  const pauseRecords = [
    {
      startDate: '2026-09-14',
      endDate: '2026-09-17',
      reason: 'Transfer handover buffer'
    }
  ];

  const result = calculateBill({
    subscription,
    plan: testPlan,
    pauseRecords,
    monthStr: '2026-09'
  });

  const billA = result.customerBills.find((b) => b.customerId === 'cust-A');
  const billB = result.customerBills.find((b) => b.customerId === 'cust-B');

  // Customer A: 11 weekdays - 2 paused (Sep 14, 15) = 9 billable days
  assert.equal(billA.pausedWeekdays, 2);
  assert.equal(billA.billableDays, 9);
  assert.equal(billA.finalAmount, 900);

  // Customer B: 11 weekdays - 2 paused (Sep 16, 17) = 9 billable days
  assert.equal(billB.pausedWeekdays, 2);
  assert.equal(billB.billableDays, 9);
  assert.equal(billB.finalAmount, 900);

  // Invariant: total billable days = 18 (22 - 4)
  assert.equal(billA.billableDays + billB.billableDays, 18);
  assert.equal(billA.finalAmount + billB.finalAmount, 1800);
});

test('T6 Mid-Cycle Transfer - Transfer on very first weekday of month', () => {
  // Sep 1, 2026 is Tuesday (the very first weekday).
  // Transfer date: Sep 1, 2026.
  // Outgoing customer A: to = Aug 31 (0 days in Sep).
  // Incoming customer B: from = Sep 1 (all 22 weekdays in Sep).
  const subscription = {
    _id: 'sub-transfer-3',
    planId: testPlan._id,
    cycleStartDate: '2026-01-01',
    ownershipHistory: [
      { customerId: 'cust-A', from: '2026-01-01', to: '2026-08-31' },
      { customerId: 'cust-B', from: '2026-09-01', to: null }
    ]
  };

  const result = calculateBill({
    subscription,
    plan: testPlan,
    pauseRecords: [],
    monthStr: '2026-09'
  });

  const billB = result.customerBills.find((b) => b.customerId === 'cust-B');
  assert.ok(billB);
  assert.equal(billB.billableDays, 22);
  assert.equal(billB.finalAmount, 2200);
});

test('T6 Mid-Cycle Transfer - Two transfers within the same month (chain of 3 owners)', () => {
  // Sep 1-4 (4 weekdays): Cust A (to: Sep 6)
  // Sep 7-18 (10 weekdays): Cust B (from: Sep 7, to: Sep 20)
  // Sep 21-30 (8 weekdays): Cust C (from: Sep 21, to: null)
  // Total = 4 + 10 + 8 = 22 weekdays.
  const subscription = {
    _id: 'sub-transfer-4',
    planId: testPlan._id,
    cycleStartDate: '2026-01-01',
    ownershipHistory: [
      { customerId: 'cust-A', from: '2026-01-01', to: '2026-09-06' },
      { customerId: 'cust-B', from: '2026-09-07', to: '2026-09-20' },
      { customerId: 'cust-C', from: '2026-09-21', to: null }
    ]
  };

  const result = calculateBill({
    subscription,
    plan: testPlan,
    pauseRecords: [],
    monthStr: '2026-09'
  });

  assert.equal(result.customerBills.length, 3);
  const billA = result.customerBills.find((b) => b.customerId === 'cust-A');
  const billB = result.customerBills.find((b) => b.customerId === 'cust-B');
  const billC = result.customerBills.find((b) => b.customerId === 'cust-C');

  assert.equal(billA.billableDays, 4);
  assert.equal(billA.finalAmount, 400);

  assert.equal(billB.billableDays, 10);
  assert.equal(billB.finalAmount, 1000);

  assert.equal(billC.billableDays, 8);
  assert.equal(billC.finalAmount, 800);

  assert.equal(billA.billableDays + billB.billableDays + billC.billableDays, 22);
  assert.equal(billA.finalAmount + billB.finalAmount + billC.finalAmount, 2200);
});
