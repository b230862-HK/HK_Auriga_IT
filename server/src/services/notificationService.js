import { Subscription } from '../models/Subscription.js';
import { Customer } from '../models/Customer.js';
import { PauseRecord } from '../models/PauseRecord.js';
import { Notification } from '../models/Notification.js';
import { getDueToday } from '../utils/notificationUtils.js';
import { formatDateString, parseDateOnly } from '../utils/dateUtils.js';

// Global in-memory virtual date for grading simulation
let virtualDate = formatDateString(new Date());

export function getVirtualDate() {
  return virtualDate;
}

export function setVirtualDate(dateStr) {
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    virtualDate = dateStr;
  }
  return virtualDate;
}

export function advanceVirtualDate() {
  const current = parseDateOnly(virtualDate) || new Date();
  current.setUTCDate(current.getUTCDate() + 1);
  virtualDate = formatDateString(current);
  return virtualDate;
}

/**
 * Execute the morning notification dispatch job for the specified date.
 * Enforces idempotency per subscription per date.
 */
export async function runMorningNotifications(dateStr) {
  const targetDate = dateStr || virtualDate;

  // 1. Fetch all active subscriptions populated with customer and plan
  const subscriptions = await Subscription.find({ status: 'active' })
    .populate('currentCustomerId')
    .populate('planId');

  // 2. Fetch all pause records
  const pauseRecords = await PauseRecord.find();

  // 3. Compute which subscriptions are due today
  const dueSubscriptions = getDueToday(subscriptions, pauseRecords, targetDate);

  const notifiedSubscriptionIds = [];

  for (const sub of dueSubscriptions) {
    const customer = sub.currentCustomerId;
    if (!customer) continue;

    const subId = sub._id;
    const custId = customer._id;
    const phone = customer.phone;
    const planName = sub.planId?.name || 'Tiffin Lunch';

    // Idempotency check: see if already sent
    const existing = await Notification.findOne({ subscriptionId: subId, date: targetDate });
    if (existing) {
      continue;
    }

    const message = `Good morning ${customer.name}! Your fresh home-style lunch (${planName}) is scheduled for delivery today (${targetDate}). Enjoy your meal!`;

    try {
      const notif = await Notification.create({
        subscriptionId: subId,
        customerId: custId,
        phone,
        date: targetDate,
        message,
        sentAt: new Date()
      });
      notifiedSubscriptionIds.push(subId);
    } catch (err) {
      // Ignore duplicate key errors in concurrent calls
      if (err.code !== 11000) {
        console.error('[NotificationService] Error sending notification:', err);
      }
    }
  }

  return {
    date: targetDate,
    notifiedCount: notifiedSubscriptionIds.length,
    notifiedSubscriptionIds
  };
}

export async function getOutbox(filterDate = null) {
  const query = {};
  if (filterDate) {
    query.date = filterDate;
  }
  return Notification.find(query).sort({ sentAt: -1, createdAt: -1 });
}

export async function resetOutbox() {
  await Notification.deleteMany({});
  return { success: true, message: 'Outbox cleared successfully' };
}
