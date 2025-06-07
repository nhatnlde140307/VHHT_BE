import express from 'express';
import { createDonationCampaign, approveDonationCampaign } from '../controllers/donationCampaign.controller.js';
import { organizationValidator } from '../middlewares/users.middlewares.js';

const donateRouter = express.Router();

donateRouter.post('/',organizationValidator, createDonationCampaign);

donateRouter.put('/:id/approve', approveDonationCampaign);

donateRouter.post('/:id/reject', createDonationCampaign);

export default donateRouter;