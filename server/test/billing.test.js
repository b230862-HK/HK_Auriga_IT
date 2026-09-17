import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBill } from '../src/utils/billing.js';
import { getAllMonthWeekdays } from '../src/utils/dateUtils.js';

// Month under test: September 2026
// Sep 1, 2026 is Tuesday.
// Calendar days in Sep 2026: 30 days.
// Weekdays in Sep 2026:
// Sep 1-4 (Tue-Fri) = 4
// Sep 7-11 (Mon-Fri) = 5
// Sep 14-18 (Mon-Fri) = 5
// Sep 21-25 (Mon-Fri) = 5
// Sep 28-30 (Mon-Wed) = 3
// Total calendar weekdays = 22 weekdays.

const testPlan = {
  _id: 'plan-1',
  name: 'Standard Veg Monthly',
  price: 2200 // Exactly 100 per weekday in 22-weekday month
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
  // Joined on Wednesday, Sep 16, 2026
  // Weekdays from Sep 16:
  // Sep 16, 17, 18 (3)
  // Sep 21, 22, 23, 24, 25 (5)
  // Sep 28, 29, 30 (3)
  // Total customer weekdays = 11 weekdays.
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
  // Paused from Sep 7 (Mon) to Sep 11 (Fri) = 5 weekdays
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
  // Pause 1: Sep 7 (Mon) to Sep 11 (Fri) [Sep 7, 8, 9, 10, 11] (5 days)
  // Pause 2: Sep 9 (Wed) to Sep 15 (Tue) [Sep 9, 10, 11, 14, 15] (5 days)
  // Union weekdays: Sep 7, 8, 9, 10, 11, 14, 15 = 7 unique weekdays
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
  // Pause starts Aug 28 and ends Sep 4
  // Aug weekdays should not count toward Sep pause
  // Sep weekdays in range: Sep 1, 2, 3, 4 (4 weekdays)
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
  // Paused indefinitely starting Sep 21 (Mon)
  // Remaining weekdays in Sep 2026:
  // Sep 21-25 (5) + Sep 28-30 (3) = 8 weekdays
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
  // Started pause Sep 7, resumed mid-pause on Sep 10.
  // Resume date (Sep 10) is billable!
  // Paused days: Sep 7, 8, 9 = 3 weekdays.
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
  // Sep 12 (Sat) to Sep 13 (Sun)
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
