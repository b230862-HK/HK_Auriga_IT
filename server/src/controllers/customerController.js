import { Customer } from '../models/Customer.js';
import { Subscription } from '../models/Subscription.js';
import { Plan } from '../models/Plan.js';
import { PauseRecord } from '../models/PauseRecord.js';
import { parseDateOnly, formatDateString } from '../utils/dateUtils.js';
import { normalizePhone as cleanPhoneUtil, validateRow } from '../utils/importUtils.js';

export function normalizePhone(rawPhone) {
  return cleanPhoneUtil(rawPhone) || (rawPhone ? String(rawPhone).replace(/[\s\-()]/g, '') : '');
}

export function isValidPhone(phone) {
  return /^\+?[0-9]{7,15}$/.test(phone);
}

export async function createCustomer(req, res, next) {
  try {
    const { name, phone, address, planId, subscriptionStartDate } = req.body;

    if (!name || !phone || !planId) {
      return res.status(400).json({
        success: false,
        error: 'Customer name, phone number, and plan ID are required.'
      });
    }

    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone || cleanPhone.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid phone number with at least 10 digits.'
      });
    }

    // Check phone uniqueness
    let customer = await Customer.findOne({ phone: cleanPhone });
    if (customer) {
      // Check if customer already has an active or paused subscription
      const existingSub = await Subscription.findOne({
        currentCustomerId: customer._id,
        status: { $in: ['active', 'paused'] }
      });
      if (existingSub) {
        return res.status(409).json({
          success: false,
          error: `A customer with phone number "${cleanPhone}" is already actively subscribed.`
        });
      }
    } else {
      customer = new Customer({
        name: name.trim(),
        phone: cleanPhone,
        address: address ? address.trim() : ''
      });
      await customer.save();
    }

    // Verify plan exists
    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Selected subscription plan does not exist.'
      });
    }

    const startDate = subscriptionStartDate ? parseDateOnly(subscriptionStartDate) : parseDateOnly(new Date());

    const subscription = new Subscription({
      planId,
      cycleStartDate: startDate,
      status: 'active',
      currentCustomerId: customer._id,
      ownershipHistory: [
        {
          customerId: customer._id,
          from: startDate,
          to: null
        }
      ]
    });

    await subscription.save();
    await subscription.populate('planId');

    // Return combined customer representation for UI
    const customerObj = customer.toObject();
    customerObj.planId = plan;
    customerObj.subscriptionStartDate = startDate;
    customerObj.status = 'active';
    customerObj.subscriptionId = subscription._id;

    res.status(201).json({
      success: true,
      message: 'Customer subscribed successfully',
      customer: customerObj,
      subscription
    });
  } catch (err) {
    next(err);
  }
}

export async function getCustomerByPhone(req, res, next) {
  try {
    const rawPhone = req.params.phone;
    const cleanPhone = normalizePhone(rawPhone);

    const customer = await Customer.findOne({
      $or: [{ phone: cleanPhone }, { phone: rawPhone }]
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: `No customer found with phone number "${rawPhone}".`
      });
    }

    // Find subscription where this customer is current owner (or historical owner)
    let subscription = await Subscription.findOne({ currentCustomerId: customer._id })
      .populate('planId')
      .populate('currentCustomerId')
      .populate('ownershipHistory.customerId');

    if (!subscription) {
      subscription = await Subscription.findOne({ 'ownershipHistory.customerId': customer._id })
        .populate('planId')
        .populate('currentCustomerId')
        .populate('ownershipHistory.customerId');
    }

    let pauses = [];
    let activePause = null;

    if (subscription) {
      pauses = await PauseRecord.find({ subscriptionId: subscription._id }).sort({ startDate: -1 });

      const today = parseDateOnly(new Date());
      activePause = pauses.find((p) => {
        const start = parseDateOnly(p.startDate);
        const end = p.endDate ? parseDateOnly(p.endDate) : null;
        if (p.isResumed) return false;
        if (end) return start <= today && end >= today;
        return start <= today;
      });
    }

    const customerObj = customer.toObject();
    if (subscription) {
      customerObj.planId = subscription.planId;
      customerObj.subscriptionStartDate = subscription.cycleStartDate;
      customerObj.status = subscription.status;
      customerObj.subscriptionId = subscription._id;
      customerObj.ownershipHistory = subscription.ownershipHistory;
    }

    res.json({
      success: true,
      customer: customerObj,
      subscription,
      activePause: activePause || null,
      pauses
    });
  } catch (err) {
    next(err);
  }
}

export async function listCustomers(req, res, next) {
  try {
    const { status, search } = req.query;

    const subFilter = {};
    if (status && ['active', 'paused', 'cancelled'].includes(status)) {
      subFilter.status = status;
    }

    // Fetch subscriptions with current customer and plan
    const subscriptions = await Subscription.find(subFilter)
      .populate('planId')
      .populate('currentCustomerId')
      .sort({ createdAt: -1 });

    const [activeCount, pausedCount, cancelledCount, totalCount] = await Promise.all([
      Subscription.countDocuments({ status: 'active' }),
      Subscription.countDocuments({ status: 'paused' }),
      Subscription.countDocuments({ status: 'cancelled' }),
      Subscription.countDocuments()
    ]);

    // Shape into combined customer objects for frontend tables
    let customersList = subscriptions.map((sub) => {
      const cust = sub.currentCustomerId ? sub.currentCustomerId.toObject() : {};
      return {
        ...cust,
        _id: cust._id || sub._id,
        subscriptionId: sub._id,
        planId: sub.planId,
        subscriptionStartDate: sub.cycleStartDate,
        status: sub.status,
        ownershipHistory: sub.ownershipHistory
      };
    });

    if (search) {
      const cleanSearch = normalizePhone(search);
      customersList = customersList.filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(search.toLowerCase())) ||
          (c.phone && c.phone.includes(cleanSearch || search))
      );
    }

    res.json({
      success: true,
      counts: {
        active: activeCount,
        paused: pausedCount,
        cancelled: cancelledCount,
        total: totalCount
      },
      customers: customersList
    });
  } catch (err) {
    next(err);
  }
}

export async function pauseCustomer(req, res, next) {
  try {
    const { id } = req.params;
    const { startDate, endDate, reason } = req.body;

    // Check if id is a Subscription ID or Customer ID
    let subscription = await Subscription.findById(id);
    if (!subscription) {
      subscription = await Subscription.findOne({ currentCustomerId: id, status: { $in: ['active', 'paused'] } });
    }

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Active subscription not found.'
      });
    }

    if (!startDate) {
      return res.status(400).json({
        success: false,
        error: 'Pause startDate is required.'
      });
    }

    const parsedStart = parseDateOnly(startDate);
    const parsedEnd = endDate ? parseDateOnly(endDate) : null;

    if (parsedEnd && parsedEnd < parsedStart) {
      return res.status(400).json({
        success: false,
        error: 'Pause endDate cannot be earlier than startDate.'
      });
    }

    const pauseRecord = new PauseRecord({
      subscriptionId: subscription._id,
      startDate: parsedStart,
      endDate: parsedEnd,
      reason: reason ? reason.trim() : ''
    });

    await pauseRecord.save();

    const today = parseDateOnly(new Date());
    if (parsedStart <= today && (!parsedEnd || parsedEnd >= today)) {
      subscription.status = 'paused';
      await subscription.save();
    }

    res.status(201).json({
      success: true,
      message: 'Subscription paused successfully',
      subscription,
      pauseRecord
    });
  } catch (err) {
    next(err);
  }
}

export async function resumeCustomer(req, res, next) {
  try {
    const { id } = req.params;

    let subscription = await Subscription.findById(id);
    if (!subscription) {
      subscription = await Subscription.findOne({ currentCustomerId: id, status: 'paused' });
    }

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Paused subscription not found.'
      });
    }

    const today = parseDateOnly(new Date());
    const activePause = await PauseRecord.findOne({
      subscriptionId: subscription._id,
      isResumed: false,
      $or: [{ endDate: null }, { endDate: { $gte: today } }]
    }).sort({ startDate: -1 });

    if (activePause) {
      activePause.isResumed = true;
      activePause.resumedAt = today;
      activePause.endDate = today;
      await activePause.save();
    }

    subscription.status = 'active';
    await subscription.save();

    res.json({
      success: true,
      message: 'Subscription resumed successfully',
      subscription,
      pauseRecord: activePause || null
    });
  } catch (err) {
    next(err);
  }
}

export async function getCustomerPauses(req, res, next) {
  try {
    const { id } = req.params;
    let subscription = await Subscription.findById(id);
    if (!subscription) {
      subscription = await Subscription.findOne({ currentCustomerId: id });
    }

    const subId = subscription ? subscription._id : id;
    const pauses = await PauseRecord.find({ subscriptionId: subId }).sort({ startDate: -1 });

    res.json({
      success: true,
      pauses
    });
  } catch (err) {
    next(err);
  }
}

/**
 * T4 Messy Data Import Endpoint
 * Accepts: JSON array of raw customer rows
 * Returns: { imported, deduped, rejected }
 */
export async function importCustomers(req, res, next) {
  try {
    const rawRows = Array.isArray(req.body) ? req.body : req.body?.rows || req.body?.customers;

    if (!rawRows || !Array.isArray(rawRows)) {
      return res.status(400).json({
        success: false,
        error: 'Expected a JSON array of customer rows.'
      });
    }

    // 1. Build plan lookup map (by lowercase name and by _id)
    const plans = await Plan.find();
    const planLookup = new Map();
    for (const p of plans) {
      planLookup.set(p.name.toLowerCase().trim(), p);
      planLookup.set(String(p._id), p);
    }

    // 2. Fetch existing customer phones from database
    const existingCustomers = await Customer.find({}, { phone: 1 });
    const existingDbPhones = new Set(existingCustomers.map((c) => c.phone));

    const seenInBatchPhones = new Set();
    const rejected = [];
    let imported = 0;
    let deduped = 0;

    for (const rawRow of rawRows) {
      const validation = validateRow(rawRow, planLookup);

      if (!validation.valid) {
        rejected.push({
          row: rawRow,
          reason: validation.reason
        });
        continue;
      }

      const cleanRow = validation.cleanRow;

      // Check deduplication (both in-batch and pre-existing in DB)
      if (seenInBatchPhones.has(cleanRow.phone) || existingDbPhones.has(cleanRow.phone)) {
        deduped++;
        continue;
      }

      // Mark as seen in this batch
      seenInBatchPhones.add(cleanRow.phone);
      existingDbPhones.add(cleanRow.phone);

      // Create Customer and Subscription
      const customer = new Customer({
        name: cleanRow.name,
        phone: cleanRow.phone,
        address: cleanRow.address
      });
      await customer.save();

      const startDate = parseDateOnly(cleanRow.startDate);
      const subscription = new Subscription({
        planId: cleanRow.planId,
        cycleStartDate: startDate,
        status: 'active',
        currentCustomerId: customer._id,
        ownershipHistory: [
          {
            customerId: customer._id,
            from: startDate,
            to: null
          }
        ]
      });
      await subscription.save();

      imported++;
    }

    res.json({
      imported,
      deduped,
      rejected
    });
  } catch (err) {
    next(err);
  }
}
