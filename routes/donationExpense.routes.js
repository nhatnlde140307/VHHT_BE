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

const Erouter = express.Router();

Erouter.post(
  '/',
  organizationAndManagerValidator,
  uploadCloud.array('images', 5),
  createExpense
);

Erouter.patch('/:id/approve', managerValidator, approveExpense);
Erouter.patch('/:id/reject', managerValidator, rejectExpense);

Erouter.patch(
  '/:id',
  organizationAndManagerValidator,
  uploadCloud.array('images', 5),
  editExpense
);

Erouter.get('/campaign/:campaignId', getExpensesByCampaign);
Erouter.get('/campaign/:campaignId/summary', getExpenseSummary);

Erouter.delete('/:id', organizationAndManagerValidator, deleteExpense);

export default Erouter;