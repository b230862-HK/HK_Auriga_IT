import { Router } from 'express';
import { getOutbox, resetOutbox } from '../services/notificationService.js';

const router = Router();

// GET /outbox or GET /api/outbox
// Query param ?date=YYYY-MM-DD
router.get('/', async (req, res, next) => {
  try {
    const { date } = req.query;
    const notifications = await getOutbox(date);
    res.json(notifications);
  } catch (err) {
    next(err);
  }
});

// POST /outbox/reset or POST /api/outbox/reset
router.post('/reset', async (req, res, next) => {
  try {
    const result = await resetOutbox();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
