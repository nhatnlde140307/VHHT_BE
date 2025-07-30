import express from 'express';
import uploadCloud from '../utils/cloudinary.config.js';
import {
  createExpense,
  approveExpense,
  rejectExpense,
  editExpense,
  getExpensesByCampaign,
  getExpenseSummary,
  deleteExpense
} from '../controllers/donationExpense.controller.js';
import { managerValidator, organizationAndManagerValidator } from '../middlewares/users.middlewares.js';

const router = express.Router();

router.post(
  '/',
  organizationAndManagerValidator,
  uploadCloud.array('images', 5),
  createExpense
);

router.patch('/:id/approve', managerValidator, approveExpense);
router.patch('/:id/reject', managerValidator, rejectExpense);

router.patch(
  '/:id',
  organizationAndManagerValidator,
  uploadCloud.array('images', 5),
  editExpense
);

router.get('/campaign/:campaignId', getExpensesByCampaign);
router.get('/campaign/:campaignId/summary', getExpenseSummary);

router.delete('/:id', organizationAndManagerValidator, deleteExpense);

export default router;