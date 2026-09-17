import {
  parseDateOnly,
  formatDateString,
  getMonthBounds,
  getAllMonthWeekdays,
  isWeekday
} from './dateUtils.js';

/**
 * Pure, framework-agnostic billing calculation engine.
 * Supports both standard subscriptions and transferred subscriptions with split ownership.
 *
 * @param {Object} params
 * @param {Object} [params.subscription] - Subscription document with planId, cycleStartDate, ownershipHistory
 * @param {Object} [params.customer] - Legacy / fallback customer object (for backwards compatibility)
 * @param {Object} params.plan - Plan document or object (price, name, etc.)
 * @param {Array} params.pauseRecords - Array of pause records for the subscription
 * @param {string} params.monthStr - Billing month in "YYYY-MM" format
 * @returns {Object} Calculated bill summary with `customerBills` array for all active owners in the month.
 */
export function calculateBill({ subscription, customer, plan, pauseRecords = [], monthStr }) {
  if (!plan || typeof plan.price !== 'number') {
    throw new Error('Plan with valid price is required');
  }
  if (!monthStr) {
    throw new Error('monthStr (YYYY-MM) is required');
  }

  const { startOfMonth, endOfMonth } = getMonthBounds(monthStr);

  // 1. All weekdays in the calendar month
  const allCalendarWeekdays = getAllMonthWeekdays(monthStr);
  const totalMonthWeekdays = allCalendarWeekdays.length;

  if (totalMonthWeekdays === 0) {
    return {
      month: monthStr,
      totalWeekdays: 0,
      pausedWeekdays: 0,
      billableDays: 0,
      dailyRate: 0,
      finalAmount: 0,
      customerBills: [],
      details: { calendarWeekdays: 0, pausedDates: [], billableDates: [] }
    };
  }

  // 2. Base Daily Rate = planPrice / total calendar weekdays in that month (shared)
  const dailyRate = plan.price / totalMonthWeekdays;

  // 3. Resolve cycle start date
  const subStartRaw = subscription?.cycleStartDate || customer?.subscriptionStartDate;
  if (!subStartRaw) {
    throw new Error('Subscription cycleStartDate (or customer subscriptionStartDate) is required');
  }
  const cycleStart = parseDateOnly(subStartRaw);

  // If subscription starts after this month ends, 0 billable days
  if (cycleStart > endOfMonth) {
    return {
      month: monthStr,
      totalWeekdays: 0,
      pausedWeekdays: 0,
      billableDays: 0,
      dailyRate: Number(dailyRate.toFixed(4)),
      finalAmount: 0,
      customerBills: [],
      details: { calendarWeekdays: totalMonthWeekdays, pausedDates: [], billableDates: [] }
    };
  }

  // 4. Resolve ownership segments
  let ownershipSegments = [];
  if (subscription?.ownershipHistory && subscription.ownershipHistory.length > 0) {
    ownershipSegments = subscription.ownershipHistory.map((seg) => ({
      customerId: seg.customerId?._id || seg.customerId,
      from: parseDateOnly(seg.from),
      to: seg.to ? parseDateOnly(seg.to) : null
    }));
  } else {
    // Single-owner fallback
    const singleCustomerId = customer?._id || subscription?.currentCustomerId || 'default-customer';
    ownershipSegments = [
      {
        customerId: singleCustomerId,
        from: cycleStart,
        to: null
      }
    ];
  }

  // 5. Collect and de-duplicate all paused weekdays
  const pausedDatesSet = new Set();
  for (const pause of pauseRecords) {
    if (!pause || !pause.startDate) continue;

    const pStart = parseDateOnly(pause.startDate);
    let pEnd = pause.endDate ? parseDateOnly(pause.endDate) : endOfMonth;

    // Mid-pause resume rule: resume date itself is delivered/billable
    if (pause.isResumed || pause.resumedAt) {
      const resumeDay = parseDateOnly(pause.resumedAt || pause.endDate);
      if (resumeDay && pEnd >= resumeDay) {
        pEnd = new Date(resumeDay.getTime() - 86400000);
      }
    }

    const curr = new Date(pStart.getTime());
    while (curr <= pEnd) {
      if (isWeekday(curr)) {
        const currDate = parseDateOnly(curr);
        if (currDate >= startOfMonth && currDate <= endOfMonth && currDate >= cycleStart) {
          pausedDatesSet.add(formatDateString(curr));
        }
      }
      curr.setUTCDate(curr.getUTCDate() + 1);
    }
  }

  // 6. Map each calendar weekday to an owning customer and paused status
  // Map of customerId string -> { customerId, weekdays: [], pausedDates: [], billableDates: [] }
  const customerMap = new Map();

  // Helper to ensure customer entry exists
  const getCustomerEntry = (custId) => {
    const key = String(custId);
    if (!customerMap.has(key)) {
      customerMap.set(key, {
        customerId: custId,
        weekdays: [],
        pausedDates: [],
        billableDates: []
      });
    }
    return customerMap.get(key);
  };

  // Pre-populate entries for any ownership segment that overlaps this month
  for (const seg of ownershipSegments) {
    const segFrom = seg.from;
    const segTo = seg.to || endOfMonth;
    if (segFrom <= endOfMonth && segTo >= startOfMonth) {
      getCustomerEntry(seg.customerId);
    }
  }

  for (const dateStr of allCalendarWeekdays) {
    const d = parseDateOnly(dateStr);

    // Skip weekdays prior to subscription cycle start
    if (d < cycleStart) continue;

    // Determine which ownership segment owns this day
    // Segments are ordered chronologically. The last matching segment wins.
    let ownerId = null;
    for (const seg of ownershipSegments) {
      const segFrom = seg.from;
      const segTo = seg.to ? seg.to : null;
      if (d >= segFrom && (!segTo || d <= segTo)) {
        ownerId = seg.customerId;
      }
    }

    if (!ownerId) continue;

    const entry = getCustomerEntry(ownerId);
    entry.weekdays.push(dateStr);

    if (pausedDatesSet.has(dateStr)) {
      entry.pausedDates.push(dateStr);
    } else {
      entry.billableDates.push(dateStr);
    }
  }

  // 7. Generate bill objects per customer
  const customerBills = [];
  let totalSubscriptionWeekdays = 0;
  let totalSubscriptionPaused = 0;
  let totalSubscriptionBillable = 0;

  for (const [, entry] of customerMap.entries()) {
    const totalWeekdays = entry.weekdays.length;
    const pausedWeekdays = entry.pausedDates.length;
    const billableDays = entry.billableDates.length;
    const finalAmount = Math.round(dailyRate * billableDays * 100) / 100;

    totalSubscriptionWeekdays += totalWeekdays;
    totalSubscriptionPaused += pausedWeekdays;
    totalSubscriptionBillable += billableDays;

    customerBills.push({
      customerId: entry.customerId,
      month: monthStr,
      totalWeekdays,
      pausedWeekdays,
      billableDays,
      dailyRate: Number(dailyRate.toFixed(4)),
      finalAmount,
      isTransferred: ownershipSegments.length > 1,
      details: {
        calendarWeekdays: totalMonthWeekdays,
        customerWeekdays: entry.weekdays,
        pausedDates: entry.pausedDates,
        billableDates: entry.billableDates
      }
    });
  }

  const primaryBill = customerBills[0] || {
    month: monthStr,
    totalWeekdays: 0,
    pausedWeekdays: 0,
    billableDays: 0,
    dailyRate: Number(dailyRate.toFixed(4)),
    finalAmount: 0,
    details: { calendarWeekdays: totalMonthWeekdays, pausedDates: [], billableDates: [] }
  };

  const totalFinalAmount = Math.round(dailyRate * totalSubscriptionBillable * 100) / 100;

  return {
    month: monthStr,
    totalWeekdays: customerBills.length > 1 ? totalSubscriptionWeekdays : primaryBill.totalWeekdays,
    pausedWeekdays: customerBills.length > 1 ? totalSubscriptionPaused : primaryBill.pausedWeekdays,
    billableDays: customerBills.length > 1 ? totalSubscriptionBillable : primaryBill.billableDays,
    dailyRate: Number(dailyRate.toFixed(4)),
    finalAmount: customerBills.length > 1 ? totalFinalAmount : primaryBill.finalAmount,
    customerBills,
    details: {
      calendarWeekdays: totalMonthWeekdays,
      pausedDates: Array.from(pausedDatesSet).sort(),
      billableDates: customerBills.flatMap((b) => b.details.billableDates)
    }
  };
}
