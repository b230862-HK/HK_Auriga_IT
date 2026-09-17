import { Subscription } from '../models/Subscription.js';
import { Customer } from '../models/Customer.js';
import { PauseRecord } from '../models/PauseRecord.js';
import { Plan } from '../models/Plan.js';
import { parseDateOnly, formatDateString } from '../utils/dateUtils.js';
import { normalizePhone, isValidPhone } from './customerController.js';

export async function transferSubscription(req, res, next) {
  try {
    const { id } = req.params;
    const { transferDate, newCustomer } = req.body;

    if (!transferDate || !newCustomer) {
      return res.status(400).json({
        success: false,
        error: 'transferDate (YYYY-MM-DD) and newCustomer details are required.'
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(transferDate)) {
      return res.status(400).json({
        success: false,
        error: 'transferDate must be in YYYY-MM-DD format.'
      });
    }

    if (!newCustomer.name || !newCustomer.phone) {
      return res.status(400).json({
        success: false,
        error: 'newCustomer name and phone are required.'
      });
    }

    const subscription = await Subscription.findById(id);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found.'
      });
    }

    const targetTransferDate = parseDateOnly(transferDate);

    // Identify current active ownership segment (to === null)
    let currentSegIndex = subscription.ownershipHistory.findIndex((s) => s.to === null);
    if (currentSegIndex === -1) {
      // Fallback: create initial segment from currentCustomerId
      subscription.ownershipHistory.push({
        customerId: subscription.currentCustomerId,
        from: subscription.cycleStartDate,
        to: null
      });
      currentSegIndex = subscription.ownershipHistory.length - 1;
    }

    const currentSeg = subscription.ownershipHistory[currentSegIndex];
    const currentFrom = parseDateOnly(currentSeg.from);

    if (targetTransferDate < currentFrom) {
      return res.status(400).json({
        success: false,
        error: `transferDate (${transferDate}) cannot be earlier than current owner start date (${formatDateString(currentFrom)}).`
      });
    }

    // Lookup or create new customer
    const cleanPhone = normalizePhone(newCustomer.phone);
    let targetCustomer = await Customer.findOne({ phone: cleanPhone });

    if (!targetCustomer) {
      targetCustomer = new Customer({
        name: newCustomer.name.trim(),
        phone: cleanPhone,
        address: newCustomer.address ? newCustomer.address.trim() : ''
      });
      await targetCustomer.save();
    }

    // Keep outgoing owner profile reference
    const outgoingCustomerId = currentSeg.customerId;
    const outgoingCustomer = await Customer.findById(outgoingCustomerId);

    // Rule: Outgoing customer billable through transferDate - 1.
    // Incoming customer billable from transferDate onward.
    const dayBeforeTransfer = new Date(targetTransferDate.getTime() - 86400000);
    currentSeg.to = dayBeforeTransfer;

    // Push new segment for incoming customer
    subscription.ownershipHistory.push({
      customerId: targetCustomer._id,
      from: targetTransferDate,
      to: null
    });

    subscription.currentCustomerId = targetCustomer._id;
    // Note: planId and cycleStartDate remain unchanged!

    await subscription.save();

    await subscription.populate([
      { path: 'planId' },
      { path: 'currentCustomerId' },
      { path: 'ownershipHistory.customerId' }
    ]);

    res.json({
      success: true,
      message: `Subscription successfully transferred to ${targetCustomer.name} on ${transferDate}.`,
      subscription,
      outgoingCustomer,
      incomingCustomer: targetCustomer
    });
  } catch (err) {
    next(err);
  }
}

export async function getSubscriptionById(req, res, next) {
  try {
    const { id } = req.params;
    const subscription = await Subscription.findById(id).populate([
      { path: 'planId' },
      { path: 'currentCustomerId' },
      { path: 'ownershipHistory.customerId' }
    ]);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found.'
      });
    }

    const pauses = await PauseRecord.find({ subscriptionId: id }).sort({ startDate: -1 });

    res.json({
      success: true,
      subscription,
      pauses
    });
  } catch (err) {
    next(err);
  }
}

export async function pauseSubscription(req, res, next) {
  try {
    const { id } = req.params;
    const { startDate, endDate, reason } = req.body;

    const subscription = await Subscription.findById(id);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found.'
      });
    }

    if (!startDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate is required.'
      });
    }

    const pStart = parseDateOnly(startDate);
    const pEnd = endDate ? parseDateOnly(endDate) : null;

    if (pEnd && pEnd < pStart) {
      return res.status(400).json({
        success: false,
        error: 'endDate cannot be earlier than startDate.'
      });
    }

    const pauseRecord = new PauseRecord({
      subscriptionId: subscription._id,
      startDate: pStart,
      endDate: pEnd,
      reason: reason ? reason.trim() : ''
    });

    await pauseRecord.save();

    const today = parseDateOnly(new Date());
    if (pStart <= today && (!pEnd || pEnd >= today)) {
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

export async function resumeSubscription(req, res, next) {
  try {
    const { id } = req.params;

    const subscription = await Subscription.findById(id);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found.'
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
