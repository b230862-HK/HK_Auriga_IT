import { Customer } from '../models/Customer.js';
import { Plan } from '../models/Plan.js';
import { PauseRecord } from '../models/PauseRecord.js';
import { Bill } from '../models/Bill.js';
import { calculateBill } from '../utils/billing.js';
import { getMonthBounds, formatDateString } from '../utils/dateUtils.js';

export async function generateBillsForMonth(req, res, next) {
  try {
    const month = req.query.month || formatDateString(new Date()).slice(0, 7);

    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid month format. Please use YYYY-MM (e.g. 2026-09).'
      });
    }

    const { endOfMonth } = getMonthBounds(month);

    // Find all customers whose subscription started on or before the end of this month
    const customers = await Customer.find({
      subscriptionStartDate: { $lte: endOfMonth }
    }).populate('planId');

    const generatedBills = [];
    let totalBilledSum = 0;
    let totalPausedDaysSum = 0;
    let totalBillableDaysSum = 0;

    for (const customer of customers) {
      if (!customer.planId) continue;

      // Get customer's pause records
      const pauseRecords = await PauseRecord.find({ customerId: customer._id });

      // Run pure billing calculation
      const calculation = calculateBill({
        customer,
        plan: customer.planId,
        pauseRecords,
        monthStr: month
      });

      // Upsert into Bill collection
      const billDoc = await Bill.findOneAndUpdate(
        { customerId: customer._id, month },
        {
          customerId: customer._id,
          month,
          totalWeekdays: calculation.totalWeekdays,
          pausedWeekdays: calculation.pausedWeekdays,
          billableDays: calculation.billableDays,
          dailyRate: calculation.dailyRate,
          finalAmount: calculation.finalAmount,
          generatedAt: new Date(),
          details: calculation.details
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).populate({
        path: 'customerId',
        populate: { path: 'planId' }
      });

      generatedBills.push(billDoc);
      totalBilledSum += calculation.finalAmount;
      totalPausedDaysSum += calculation.pausedWeekdays;
      totalBillableDaysSum += calculation.billableDays;
    }

    res.json({
      success: true,
      message: `Generated pro-rated bills for ${generatedBills.length} customer(s) for ${month}`,
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

    const customer = await Customer.findById(customerId).populate('planId');
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found.'
      });
    }

    // Try finding existing stored bill
    let bill = await Bill.findOne({ customerId, month }).populate({
      path: 'customerId',
      populate: { path: 'planId' }
    });

    // If not already computed or if real-time calculation requested, compute fresh
    if (!bill) {
      const pauseRecords = await PauseRecord.find({ customerId: customer._id });
      const calculation = calculateBill({
        customer,
        plan: customer.planId,
        pauseRecords,
        monthStr: month
      });

      bill = {
        customerId: customer,
        month,
        totalWeekdays: calculation.totalWeekdays,
        pausedWeekdays: calculation.pausedWeekdays,
        billableDays: calculation.billableDays,
        dailyRate: calculation.dailyRate,
        finalAmount: calculation.finalAmount,
        generatedAt: new Date(),
        details: calculation.details,
        isComputedLive: true
      };
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
      .populate({
        path: 'customerId',
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
