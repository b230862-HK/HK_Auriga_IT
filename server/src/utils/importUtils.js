import { formatDateString, parseDateOnly } from './dateUtils.js';

/**
 * Normalizes a raw phone number.
 * Strips formatting (+, spaces, hyphens, parentheses).
 * Strips leading 91 or +91 country codes.
 * Returns clean 10-digit string, or null if fewer than 10 digits.
 */
export function normalizePhone(raw) {
  if (!raw) return null;
  const str = String(raw).trim();

  // Strip all non-digit characters
  let digits = str.replace(/\D/g, '');

  // Strip leading 91 country code if length is 12 (e.g. 919876543210)
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    // Strip leading 0
    digits = digits.slice(1);
  }

  // Must have at least 10 digits
  if (digits.length < 10) {
    return null;
  }

  // Keep the trailing 10 digits
  return digits.slice(-10);
}

/**
 * Parses flexible date representations into "YYYY-MM-DD".
 * Supports:
 * - ISO: "YYYY-MM-DD", "YYYY-MM-DDTHH:mm:ss..."
 * - Slash/Dash: "DD/MM/YYYY", "MM/DD/YYYY", "DD-MM-YYYY"
 * - Written: "15 Sep 2026", "15 September 2026"
 * - Epoch timestamps: seconds or milliseconds
 * Defaults ambiguous "03/04/2026" to DD/MM/YYYY (Indian/Commonwealth domain standard).
 * Returns null if unparseable or invalid calendar date (e.g. 31/02/2026).
 */
export function parseFlexibleDate(raw) {
  if (!raw && raw !== 0) return null;

  // 1. Numeric epoch timestamp
  if (typeof raw === 'number' || /^\d{10,13}$/.test(String(raw).trim())) {
    const num = Number(raw);
    const ms = num < 1e11 ? num * 1000 : num;
    const d = new Date(ms);
    if (!isNaN(d.getTime())) {
      return formatDateString(d);
    }
  }

  const str = String(raw).trim();
  if (!str) return null;

  // 2. ISO format: YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const year = parseInt(y, 10);
    const month = parseInt(m, 10);
    const day = parseInt(d, 10);
    if (isValidDate(year, month, day)) {
      return formatDateString(new Date(Date.UTC(year, month - 1, day)));
    }
    return null; // Invalid date like 2026-02-31
  }

  // 3. Separated format: DD/MM/YYYY, MM/DD/YYYY, DD-MM-YYYY
  const sepMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (sepMatch) {
    const p1 = parseInt(sepMatch[1], 10);
    const p2 = parseInt(sepMatch[2], 10);
    const year = parseInt(sepMatch[3], 10);

    let day, month;
    if (p1 > 12 && p2 <= 12) {
      // Must be DD/MM
      day = p1;
      month = p2;
    } else if (p2 > 12 && p1 <= 12) {
      // Must be MM/DD
      month = p1;
      day = p2;
    } else {
      // Ambiguous (e.g. 03/04/2026): Default to DD/MM/YYYY per domain standard
      day = p1;
      month = p2;
    }

    if (isValidDate(year, month, day)) {
      return formatDateString(new Date(Date.UTC(year, month - 1, day)));
    }
    return null;
  }

  // 4. Textual month format: "15 Sep 2026", "September 15, 2026"
  const monthMap = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
  };
  const textMatch = str.match(/^(\d{1,2})\s+([a-zA-Z]{3,9})\s+(\d{4})$/);
  if (textMatch) {
    const day = parseInt(textMatch[1], 10);
    const monKey = textMatch[2].slice(0, 3).toLowerCase();
    const month = monthMap[monKey];
    const year = parseInt(textMatch[3], 10);

    if (month && isValidDate(year, month, day)) {
      return formatDateString(new Date(Date.UTC(year, month - 1, day)));
    }
    return null;
  }

  // 5. JavaScript Date fallback parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return formatDateString(parsed);
  }

  return null;
}

function isValidDate(year, month, day) {
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

/**
 * Validates and normalizes a single raw import row against available plans.
 *
 * @param {Object} row - Raw row { name, phone, planName/planId, startDate, address }
 * @param {Map|Object} planLookup - Map of lowercase plan name or ID to Plan document
 * @returns {Object} { valid: true, cleanRow } or { valid: false, reason: string }
 */
export function validateRow(row, planLookup) {
  if (!row || typeof row !== 'object') {
    return { valid: false, reason: 'Row must be an object' };
  }

  const name = (row.name || '').trim();
  if (!name) {
    return { valid: false, reason: 'Missing or blank customer name' };
  }

  const phone = normalizePhone(row.phone);
  if (!phone) {
    return { valid: false, reason: `Invalid phone number: "${row.phone || ''}"` };
  }

  const dateRaw = row.startDate || row.subscriptionStartDate || row.date;
  const startDate = parseFlexibleDate(dateRaw);
  if (!startDate) {
    return { valid: false, reason: `Unparseable or invalid date: "${dateRaw || ''}"` };
  }

  // Resolve plan by ID or by Name
  const rawPlan = row.planName || row.planId || row.plan;
  if (!rawPlan) {
    return { valid: false, reason: 'Missing subscription plan specification' };
  }

  let resolvedPlan = null;
  const planKey = String(rawPlan).trim().toLowerCase();

  if (planLookup instanceof Map) {
    resolvedPlan = planLookup.get(planKey) || planLookup.get(String(rawPlan).trim());
  } else if (planLookup && typeof planLookup === 'object') {
    resolvedPlan = planLookup[planKey] || planLookup[String(rawPlan).trim()];
  }

  if (!resolvedPlan) {
    return { valid: false, reason: `Unknown subscription plan: "${rawPlan}"` };
  }

  return {
    valid: true,
    cleanRow: {
      name,
      phone,
      address: (row.address || '').trim(),
      planId: resolvedPlan._id,
      startDate
    }
  };
}
