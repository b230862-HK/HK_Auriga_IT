import { Router } from 'express';
import {
  getVirtualDate,
  setVirtualDate,
  advanceVirtualDate,
  runMorningNotifications
} from '../services/notificationService.js';

const router = Router();

// POST /clock or POST /api/clock
// Body: { "date": "YYYY-MM-DD" } (optional; advances by 1 day if omitted)
router.post('/', async (req, res, next) => {
  try {
    const { date } = req.body || {};

    let targetDate;
    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date format. Expected YYYY-MM-DD.'
        });
      }
      targetDate = setVirtualDate(date);
    } else {
      targetDate = advanceVirtualDate();
    }

    // Run the morning notification job immediately for this date
    const result = await runMorningNotifications(targetDate);

    res.json({
      date: result.date,
      notifiedCount: result.notifiedCount,
      notifiedSubscriptionIds: result.notifiedSubscriptionIds
    });
  } catch (err) {
    next(err);
  }
});

// GET current virtual date helper
router.get('/', (req, res) => {
  res.json({
    date: getVirtualDate()
  });
});

export default router;
