/**
 * Date utilities for Tiffin Billing and Subscriptions
 * All operations use UTC / calendar date strings (YYYY-MM-DD) to prevent timezone drift.
 */

export function parseDateOnly(dateInput) {
  if (!dateInput) return null;
  if (typeof dateInput === 'string') {
    // If format is YYYY-MM-DD or ISO string
    const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, y, m, d] = match;
      return new Date(Date.UTC(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10)));
    }
  }
  const d = new Date(dateInput);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function formatDateString(date) {
  if (!date) return '';
  const d = parseDateOnly(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isWeekday(date) {
  const d = parseDateOnly(date);
  const dayOfWeek = d.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
  return dayOfWeek >= 1 && dayOfWeek <= 5;
}

export function getMonthBounds(monthStr) {
  // monthStr: 'YYYY-MM'
  const match = monthStr.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid month format "${monthStr}", expected "YYYY-MM"`);
  }
  const year = parseInt(match[1], 10);
  const monthIndex = parseInt(match[2], 10) - 1; // 0-indexed

  const startOfMonth = new Date(Date.UTC(year, monthIndex, 1));
  const endOfMonth = new Date(Date.UTC(year, monthIndex + 1, 0)); // last day of month

  return { startOfMonth, endOfMonth, year, monthIndex };
}

export function getAllMonthWeekdays(monthStr) {
  const { startOfMonth, endOfMonth } = getMonthBounds(monthStr);
  const weekdays = [];
  const curr = new Date(startOfMonth.getTime());

  while (curr <= endOfMonth) {
    if (isWeekday(curr)) {
      weekdays.push(formatDateString(curr));
    }
    curr.setUTCDate(curr.getUTCDate() + 1);
  }

  return weekdays;
}
