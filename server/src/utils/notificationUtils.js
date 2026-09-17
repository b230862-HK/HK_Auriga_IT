import { parseDateOnly, isWeekday, formatDateString } from './dateUtils.js';

/**
 * Pure function to determine which subscriptions are due for lunch delivery today.
 *
 * @param {Array} subscriptions - Array of subscription objects
 * @param {Array} pauseRecords - Array of pause records for the subscriptions
 * @param {string} dateStr - Target date in YYYY-MM-DD format
 * @returns {Array} Subscriptions that should receive delivery on dateStr
 */
export function getDueToday(subscriptions = [], pauseRecords = [], dateStr) {
  if (!dateStr) return [];

  const targetDate = parseDateOnly(dateStr);
  if (!targetDate) return [];

  // 1. Must be a weekday (Mon–Fri)
  if (!isWeekday(targetDate)) {
    return [];
  }

  // Group pause records by subscriptionId string
  const pausesBySub = new Map();
  for (const pause of pauseRecords) {
    if (!pause || !pause.subscriptionId) continue;
    const subId = String(pause.subscriptionId?._id || pause.subscriptionId);
    if (!pausesBySub.has(subId)) {
      pausesBySub.set(subId, []);
    }
    pausesBySub.get(subId).push(pause);
  }

  const dueSubscriptions = [];

  for (const sub of subscriptions) {
    // 2. Subscription status must be 'active'
    if (sub.status !== 'active') {
      continue;
    }

    // Must be on or after original cycle start date
    const start = parseDateOnly(sub.cycleStartDate);
    if (start && targetDate < start) {
      continue;
    }

    const subId = String(sub._id || sub.id);
    const pauses = pausesBySub.get(subId) || [];

    // 3. Check if any pause record covers targetDate
    let isCoveredByPause = false;
    for (const pause of pauses) {
      const pStart = parseDateOnly(pause.startDate);
      let pEnd = pause.endDate ? parseDateOnly(pause.endDate) : null;

      // Resume semantics: if pause was resumed on date R, R itself is delivered/billable!
      if (pause.isResumed || pause.resumedAt) {
        const resumeDay = parseDateOnly(pause.resumedAt || pause.endDate);
        if (resumeDay) {
          pEnd = new Date(resumeDay.getTime() - 86400000);
        }
      }

      if (pEnd) {
        if (targetDate >= pStart && targetDate <= pEnd) {
          isCoveredByPause = true;
          break;
        }
      } else {
        // Indefinite pause: covers targetDate if targetDate >= pStart
        if (targetDate >= pStart) {
          isCoveredByPause = true;
          break;
        }
      }
    }

    if (!isCoveredByPause) {
      dueSubscriptions.push(sub);
    }
  }

  return dueSubscriptions;
}
