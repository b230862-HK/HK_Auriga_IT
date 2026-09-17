import test from 'node:test';
import assert from 'node:assert/strict';
import { getDueToday } from '../src/utils/notificationUtils.js';

test('T1 Morning Notifications - Active subscription due on weekday', () => {
  const subscriptions = [
    {
      _id: 'sub-1',
      status: 'active',
      cycleStartDate: '2026-09-01'
    }
  ];

  // Sep 16, 2026 is Wednesday
  const due = getDueToday(subscriptions, [], '2026-09-16');
  assert.equal(due.length, 1);
  assert.equal(due[0]._id, 'sub-1');
});

test('T1 Morning Notifications - Weekend dates never deliver lunch', () => {
  const subscriptions = [
    {
      _id: 'sub-1',
      status: 'active',
      cycleStartDate: '2026-09-01'
    }
  ];

  // Sep 19, 2026 is Saturday
  const dueSaturday = getDueToday(subscriptions, [], '2026-09-19');
  assert.equal(dueSaturday.length, 0);

  // Sep 20, 2026 is Sunday
  const dueSunday = getDueToday(subscriptions, [], '2026-09-20');
  assert.equal(dueSunday.length, 0);
});

test('T1 Morning Notifications - Subscription with paused status is excluded', () => {
  const subscriptions = [
    {
      _id: 'sub-paused',
      status: 'paused',
      cycleStartDate: '2026-09-01'
    }
  ];

  const due = getDueToday(subscriptions, [], '2026-09-16');
  assert.equal(due.length, 0);
});

test('T1 Morning Notifications - Active subscription covered by pause range is excluded', () => {
  const subscriptions = [
    {
      _id: 'sub-2',
      status: 'active',
      cycleStartDate: '2026-09-01'
    }
  ];

  const pauses = [
    {
      subscriptionId: 'sub-2',
      startDate: '2026-09-14',
      endDate: '2026-09-18',
      reason: 'Travel'
    }
  ];

  // Sep 16 is inside the pause range
  const due = getDueToday(subscriptions, pauses, '2026-09-16');
  assert.equal(due.length, 0);

  // Sep 21 is after the pause range -> should be due
  const dueAfter = getDueToday(subscriptions, pauses, '2026-09-21');
  assert.equal(dueAfter.length, 1);
});

test('T1 Morning Notifications - Indefinite pause excludes upcoming weekdays', () => {
  const subscriptions = [
    {
      _id: 'sub-indefinite',
      status: 'active',
      cycleStartDate: '2026-09-01'
    }
  ];

  const pauses = [
    {
      subscriptionId: 'sub-indefinite',
      startDate: '2026-09-10',
      endDate: null,
      reason: 'Medical leave'
    }
  ];

  const due = getDueToday(subscriptions, pauses, '2026-09-16');
  assert.equal(due.length, 0);
});

test('T1 Morning Notifications - Resumed mid-pause: resume date is delivered and notified', () => {
  const subscriptions = [
    {
      _id: 'sub-resumed',
      status: 'active',
      cycleStartDate: '2026-09-01'
    }
  ];

  const pauses = [
    {
      subscriptionId: 'sub-resumed',
      startDate: '2026-09-14',
      endDate: '2026-09-16',
      isResumed: true,
      resumedAt: '2026-09-16',
      reason: 'Trip cut short'
    }
  ];

  // Resume day (Sep 16) is NOT paused per billing/delivery specification -> customer receives lunch!
  const dueResumeDay = getDueToday(subscriptions, pauses, '2026-09-16');
  assert.equal(dueResumeDay.length, 1);
  assert.equal(dueResumeDay[0]._id, 'sub-resumed');

  // Prior day (Sep 15) was paused -> NOT due
  const duePriorDay = getDueToday(subscriptions, pauses, '2026-09-15');
  assert.equal(duePriorDay.length, 0);
});
