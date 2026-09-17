import { Customer } from '../models/Customer.js';
import { Plan } from '../models/Plan.js';
import { PauseRecord } from '../models/PauseRecord.js';
import { parseDateOnly, formatDateString } from '../utils/dateUtils.js';

// Normalize phone numbers (strip spaces, hyphens, parentheses)
export function normalizePhone(rawPhone) {
  if (!rawPhone) return '';
  return rawPhone.replace(/[\s\-()]/g, '');
}

export function isValidPhone(phone) {
  // Accepts standard 10-15 digit phone numbers with optional leading +
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
    if (!isValidPhone(cleanPhone)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid phone number (7-15 digits, optional + prefix).'
      });
    }

    // Check phone uniqueness
    const existing = await Customer.findOne({ phone: cleanPhone });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: `A customer with phone number "${cleanPhone}" is already subscribed.`
      });
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

    const customer = new Customer({
      name: name.trim(),
      phone: cleanPhone,
      address: address ? address.trim() : '',
      planId,
      subscriptionStartDate: startDate,
      status: 'active'
    });

    await customer.save();
    await customer.populate('planId');

    res.status(201).json({
      success: true,
      message: 'Customer subscribed successfully',
      customer
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
    }).populate('planId');

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: `No customer found with phone number "${rawPhone}".`
      });
    }

    // Also fetch their pause history
    const pauses = await PauseRecord.find({ customerId: customer._id }).sort({ startDate: -1 });

    // Identify if there is an ongoing pause
    const today = parseDateOnly(new Date());
    const activePause = pauses.find((p) => {
      const start = parseDateOnly(p.startDate);
      const end = p.endDate ? parseDateOnly(p.endDate) : null;
      if (p.isResumed) return false;
      if (end) {
        return start <= today && end >= today;
      }
      return start <= today; // ongoing indefinite
    });

    res.json({
      success: true,
      customer,
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
    const filter = {};

    if (status && ['active', 'paused', 'cancelled'].includes(status)) {
      filter.status = status;
    }

    if (search) {
      const cleanSearch = normalizePhone(search);
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: cleanSearch || search, $options: 'i' } }
      ];
    }

    const customers = await Customer.find(filter)
      .populate('planId')
      .sort({ createdAt: -1 });

    // Count statistics for the dashboard
    const [activeCount, pausedCount, cancelledCount, totalCount] = await Promise.all([
      Customer.countDocuments({ status: 'active' }),
      Customer.countDocuments({ status: 'paused' }),
      Customer.countDocuments({ status: 'cancelled' }),
      Customer.countDocuments()
    ]);

    res.json({
      success: true,
      counts: {
        active: activeCount,
        paused: pausedCount,
        cancelled: cancelledCount,
        total: totalCount
      },
      customers
    });
  } catch (err) {
    next(err);
  }
}

export async function pauseCustomer(req, res, next) {
  try {
    const { id } = req.params;
    const { startDate, endDate, reason } = req.body;

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found.'
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

    // Check if customer already has an active ongoing indefinite pause
    const ongoingPause = await PauseRecord.findOne({
      customerId: customer._id,
      isResumed: false,
      endDate: null
    });

    if (ongoingPause) {
      return res.status(400).json({
        success: false,
        error: 'Customer already has an active indefinite pause. Please resume it first.'
      });
    }

    const pauseRecord = new PauseRecord({
      customerId: customer._id,
      startDate: parsedStart,
      endDate: parsedEnd,
      reason: reason ? reason.trim() : ''
    });

    await pauseRecord.save();

    // If pause includes today or starts today/past, update customer status to paused
    const today = parseDateOnly(new Date());
    if (parsedStart <= today && (!parsedEnd || parsedEnd >= today)) {
      customer.status = 'paused';
      await customer.save();
    } else if (customer.status !== 'paused') {
      // If scheduled starting today, mark as paused
      if (formatDateString(parsedStart) === formatDateString(today)) {
        customer.status = 'paused';
        await customer.save();
      }
    }

    res.status(201).json({
      success: true,
      message: 'Subscription paused successfully',
      customer,
      pauseRecord
    });
  } catch (err) {
    next(err);
  }
}

export async function resumeCustomer(req, res, next) {
  try {
    const { id } = req.params;

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found.'
      });
    }

    const today = parseDateOnly(new Date());

    // Find the latest open or ongoing pause record
    const activePause = await PauseRecord.findOne({
      customerId: customer._id,
      isResumed: false,
      $or: [{ endDate: null }, { endDate: { $gte: today } }]
    }).sort({ startDate: -1 });

    if (activePause) {
      activePause.isResumed = true;
      activePause.resumedAt = today;
      // Per specification: close out an active/open-ended pause (set endDate = today, flip status back to active)
      // and resume date itself counts as a delivered/billable day.
      activePause.endDate = today;
      await activePause.save();
    }

    customer.status = 'active';
    await customer.save();

    res.json({
      success: true,
      message: 'Subscription resumed successfully. Customer is now active.',
      customer,
      pauseRecord: activePause || null
    });
  } catch (err) {
    next(err);
  }
}

export async function getCustomerPauses(req, res, next) {
  try {
    const { id } = req.params;
    const pauses = await PauseRecord.find({ customerId: id }).sort({ startDate: -1 });
    res.json({
      success: true,
      pauses
    });
  } catch (err) {
    next(err);
  }
}
