import { Router } from 'express';
import {
  generateBillsForMonth,
  getCustomerBill,
  getMonthlyBillsList
} from '../controllers/billingController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Protected per requirements
router.use(requireAuth);

router.post('/generate', generateBillsForMonth);
router.get('/', getMonthlyBillsList);
router.get('/:customerId', getCustomerBill);

export default router;
