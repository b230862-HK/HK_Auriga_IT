import { Subscription } from '../models/Subscription.js';
import { Customer } from '../models/Customer.js';
import { Plan } from '../models/Plan.js';
import { PauseRecord } from '../models/PauseRecord.js';
import { Bill } from '../models/Bill.js';
import { calculateBill } from '../utils/billing.js';
import { getMonthBounds, formatDateString } from '../utils/dateUtils.js';

export async function generateBillsForMonth(req, res, next) {
  try {
    const month = req.query.month || formatDateString(new Date()).slice(0, 7);

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid month format. Please use YYYY-MM (e.g. 2026-09).'
      });
    }

    const { endOfMonth } = getMonthBounds(month);

    // Find all subscriptions started on or before end of month
    const subscriptions = await Subscription.find({
      cycleStartDate: { $lte: endOfMonth }
    })
      .populate('planId')
      .populate('currentCustomerId')
      .populate('ownershipHistory.customerId');

    const generatedBills = [];
    let totalBilledSum = 0;
    let totalPausedDaysSum = 0;
    let totalBillableDaysSum = 0;

    for (const sub of subscriptions) {
      if (!sub.planId) continue;

      const pauseRecords = await PauseRecord.find({ subscriptionId: sub._id });

      const calculation = calculateBill({
        subscription: sub,
        plan: sub.planId,
        pauseRecords,
        monthStr: month
      });

      // calculation.customerBills handles single and multi-owner transfers cleanly
      for (const custBill of calculation.customerBills) {
        const billDoc = await Bill.findOneAndUpdate(
          {
            subscriptionId: sub._id,
            customerId: custBill.customerId,
            month
          },
          {
            subscriptionId: sub._id,
            customerId: custBill.customerId,
            month,
            totalWeekdays: custBill.totalWeekdays,
            pausedWeekdays: custBill.pausedWeekdays,
            billableDays: custBill.billableDays,
            dailyRate: custBill.dailyRate,
            finalAmount: custBill.finalAmount,
            isTransferred: custBill.isTransferred,
            generatedAt: new Date(),
            details: custBill.details
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        )
          .populate('customerId')
          .populate({
            path: 'subscriptionId',
            populate: { path: 'planId' }
          });

        generatedBills.push(billDoc);
        totalBilledSum += custBill.finalAmount;
        totalPausedDaysSum += custBill.pausedWeekdays;
        totalBillableDaysSum += custBill.billableDays;
      }
    }

    res.json({
      success: true,
      message: `Generated pro-rated bills for ${generatedBills.length} line item(s) for ${month}`,
      month,
      summary: {
        customerCount: generatedBills.length,
        totalBilled: Math.round(totalBilledSum * 100) / 100,
        totalPausedDays: totalPausedDaysSum,
        totalBillableDays: totalBillableDaysSum
      },
      bills: generatedBills
    });
  } catch (err) {
    next(err);
  }
}

export async function getCustomerBill(req, res, next) {
  try {
    const { customerId } = req.params;
    const month = req.query.month || formatDateString(new Date()).slice(0, 7);

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid month format. Please use YYYY-MM.'
      });
    }

    // Attempt finding existing stored bill by customerId or subscriptionId
    let bill = await Bill.findOne({
      $or: [{ customerId }, { subscriptionId: customerId }],
      month
    })
      .populate('customerId')
      .populate({
        path: 'subscriptionId',
        populate: { path: 'planId' }
      });

    if (!bill) {
      // Real-time calculation fallback
      const subscription = await Subscription.findOne({
        $or: [{ currentCustomerId: customerId }, { _id: customerId }, { 'ownershipHistory.customerId': customerId }]
      }).populate('planId');

      if (subscription) {
        const pauseRecords = await PauseRecord.find({ subscriptionId: subscription._id });
        const calculation = calculateBill({
          subscription,
          plan: subscription.planId,
          pauseRecords,
          monthStr: month
        });

        const targetBill =
          calculation.customerBills.find((b) => String(b.customerId) === String(customerId)) ||
          calculation.customerBills[0];

        if (targetBill) {
          bill = {
            subscriptionId: subscription,
            customerId: await Customer.findById(targetBill.customerId),
            month,
            totalWeekdays: targetBill.totalWeekdays,
            pausedWeekdays: targetBill.pausedWeekdays,
            billableDays: targetBill.billableDays,
            dailyRate: targetBill.dailyRate,
            finalAmount: targetBill.finalAmount,
            isTransferred: targetBill.isTransferred,
            generatedAt: new Date(),
            details: targetBill.details,
            isComputedLive: true
          };
        }
      }
    }

    res.json({
      success: true,
      bill
    });
  } catch (err) {
    next(err);
  }
}

export async function getMonthlyBillsList(req, res, next) {
  try {
    const month = req.query.month || formatDateString(new Date()).slice(0, 7);

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid month format. Please use YYYY-MM.'
      });
    }

    const bills = await Bill.find({ month })
      .populate('customerId')
      .populate({
        path: 'subscriptionId',
        populate: { path: 'planId' }
      })
      .sort({ createdAt: -1 });

    const totalBilled = bills.reduce((acc, b) => acc + (b.finalAmount || 0), 0);

    res.json({
      success: true,
      month,
      summary: {
        customerCount: bills.length,
        totalBilled: Math.round(totalBilled * 100) / 100
      },
      bills
    });
  } catch (err) {
    next(err);
  }
}
