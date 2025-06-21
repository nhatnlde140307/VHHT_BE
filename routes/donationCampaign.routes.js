import express from 'express';
import { createDonationCampaign,getDonateById,getDonationCampaigns, approveDonationCampaign,rejectDonationCampaign } from '../controllers/donationCampaign.controller.js';
import { organizationValidator, managerValidator, organizationAndManagerValidator } from '../middlewares/users.middlewares.js';
import { wrapRequestHandler } from '../utils/handlers.js';
import uploadCloud from '../utils/cloudinary.config.js';
const donateRouter = express.Router();

donateRouter.get('/', getDonationCampaigns);

donateRouter.get('/:id', getDonateById);

donateRouter.post('/',organizationAndManagerValidator,
    uploadCloud.array('images', 5), wrapRequestHandler(createDonationCampaign));

donateRouter.put('/:id/approve',managerValidator, wrapRequestHandler(approveDonationCampaign));

donateRouter.post('/:id/reject',managerValidator, wrapRequestHandler(rejectDonationCampaign));

export default donateRouter;