import { Router } from 'express';
import {
  createCustomer,
  getCustomerByPhone,
  listCustomers,
  pauseCustomer,
  resumeCustomer,
  getCustomerPauses,
  importCustomers
} from '../controllers/customerController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// All customer routes require authentication
router.use(requireAuth);

router.get('/', listCustomers);
router.post('/', createCustomer);
router.post('/import', importCustomers);

router.post('/:id/pause', pauseCustomer);
router.post('/:id/resume', resumeCustomer);
router.get('/:id/pauses', getCustomerPauses);

// Lookup by phone number
router.get('/:phone', getCustomerByPhone);

export default router;
