import { Router } from 'express';
import { getPlans, createPlan } from '../controllers/planController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Protected per requirements: "All routes except /api/auth/* require a valid JWT"
router.use(requireAuth);

router.get('/', getPlans);
router.post('/', createPlan);

export default router;
