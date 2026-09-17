import {
  parseDateOnly,
  formatDateString,
  getMonthBounds,
  getAllMonthWeekdays,
  isWeekday
} from './dateUtils.js';

/**
 * Pure, framework-agnostic billing calculation engine.
 *
 * @param {Object} params
 * @param {Object} params.customer - Customer document or object (subscriptionStartDate, etc.)
 * @param {Object} params.plan - Plan document or object (price, name, etc.)
 * @param {Array} params.pauseRecords - Array of pause records for the customer
 * @param {string} params.monthStr - Billing month in "YYYY-MM" format
 * @returns {Object} Calculated bill summary & day-by-day audit trail
 */
export function calculateBill({ customer, plan, pauseRecords = [], monthStr }) {
  if (!customer) throw new Error('Customer is required for billing calculation');
  if (!plan || typeof plan.price !== 'number') throw new Error('Plan with valid price is required');
  if (!monthStr) throw new Error('monthStr (YYYY-MM) is required');

  const { startOfMonth, endOfMonth, year, monthIndex } = getMonthBounds(monthStr);

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
      details: {
        calendarWeekdays: 0,
        customerWeekdays: [],
        pausedDates: [],
        billableDates: []
      }
    };
  }

  // 2. Base Daily Rate = planPrice / total calendar weekdays in that month
  const dailyRate = plan.price / totalMonthWeekdays;

  // 3. Customer subscription start constraint
  const subStart = parseDateOnly(customer.subscriptionStartDate);
  if (!subStart) {
    throw new Error('Customer subscriptionStartDate is invalid or missing');
  }

  // If subscribed after this month ends, 0 billable days
  if (subStart > endOfMonth) {
    return {
      month: monthStr,
      totalWeekdays: 0,
      pausedWeekdays: 0,
      billableDays: 0,
      dailyRate: Number(dailyRate.toFixed(4)),
      finalAmount: 0,
      details: {
        calendarWeekdays: totalMonthWeekdays,
        customerWeekdays: [],
        pausedDates: [],
        billableDates: []
      }
    };
  }

  // Customer's billable window starts at max(startOfMonth, subStart)
  const effectiveCustomerStart = subStart > startOfMonth ? subStart : startOfMonth;

  // Filter weekdays that fall on or after customer subscription start
  const customerWeekdays = allCalendarWeekdays.filter((dateStr) => {
    const d = parseDateOnly(dateStr);
    return d >= effectiveCustomerStart && d <= endOfMonth;
  });

  const totalCustomerWeekdays = customerWeekdays.length;

  // 4. Collect and de-duplicate all paused weekdays
  const pausedDatesSet = new Set();

  for (const pause of pauseRecords) {
    if (!pause || !pause.startDate) continue;

    const pStart = parseDateOnly(pause.startDate);
    // If endDate is null, it is paused indefinitely through the end of the month
    let pEnd = pause.endDate ? parseDateOnly(pause.endDate) : endOfMonth;

    // Edge case: Customer resumes mid-pause.
    // If the pause record indicates it was closed on resume (isResumed: true, or resumeDate specified),
    // the resume date itself counts as a delivered/billable day, so pause ended on the prior day.
    if (pause.isResumed || pause.resumedAt) {
      const resumeDay = parseDateOnly(pause.resumedAt || pause.endDate);
      // Exclude the resume date itself from the pause period
      if (resumeDay) {
        const dayBeforeResume = new Date(resumeDay.getTime() - 86400000);
        if (pEnd >= resumeDay) {
          pEnd = dayBeforeResume;
        }
      }
    }

    // Iterate through the pause range
    const curr = new Date(pStart.getTime());
    while (curr <= pEnd) {
      if (isWeekday(curr)) {
        const currStr = formatDateString(curr);
        // Only include if within the customer's active subscription window in this month
        const currDate = parseDateOnly(curr);
        if (currDate >= effectiveCustomerStart && currDate <= endOfMonth) {
          pausedDatesSet.add(currStr);
        }
      }
      curr.setUTCDate(curr.getUTCDate() + 1);
    }
  }

  const pausedWeekdays = pausedDatesSet.size;
  const billableDays = Math.max(0, totalCustomerWeekdays - pausedWeekdays);
  const finalAmount = Math.round(dailyRate * billableDays * 100) / 100;

  const billableDates = customerWeekdays.filter((d) => !pausedDatesSet.has(d));

  return {
    month: monthStr,
    totalWeekdays: totalCustomerWeekdays,
    pausedWeekdays,
    billableDays,
    dailyRate: Number(dailyRate.toFixed(4)),
    finalAmount,
    details: {
      calendarWeekdays: totalMonthWeekdays,
      customerWeekdays,
      pausedDates: Array.from(pausedDatesSet).sort(),
      billableDates
    }
  };
}
