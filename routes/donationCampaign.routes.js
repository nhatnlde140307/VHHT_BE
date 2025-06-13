import express from 'express';
import { createDonationCampaign,getDonationCampaigns, approveDonationCampaign,rejectDonationCampaign } from '../controllers/donationCampaign.controller.js';
import { organizationValidator, managerValidator, organizationAndManagerValidator } from '../middlewares/users.middlewares.js';
import { wrapRequestHandler } from '../utils/handlers.js';
const donateRouter = express.Router();

donateRouter.get('/', getDonationCampaigns);

donateRouter.post('/',organizationAndManagerValidator, wrapRequestHandler(createDonationCampaign));

donateRouter.put('/:id/approve',managerValidator, wrapRequestHandler(approveDonationCampaign));

donateRouter.post('/:id/reject',managerValidator, wrapRequestHandler(rejectDonationCampaign));

export default donateRouter;