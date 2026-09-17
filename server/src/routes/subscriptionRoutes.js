import { Router } from 'express';
import {
  transferSubscription,
  getSubscriptionById,
  pauseSubscription,
  resumeSubscription
} from '../controllers/subscriptionController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Protected routes
router.use(requireAuth);

router.post('/:id/transfer', transferSubscription);
router.get('/:id', getSubscriptionById);
router.post('/:id/pause', pauseSubscription);
router.post('/:id/resume', resumeSubscription);

export default router;
