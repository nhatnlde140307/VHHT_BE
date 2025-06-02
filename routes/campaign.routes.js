import express from 'express'
import { wrapRequestHandler } from '../utils/handlers.js'
import {
  adminValidator,accessTokenValidator, loginValidator
} from '../middlewares/users.middlewares.js'
import { getListCampaigns,getCampaignVolunteers,
        startCampaignHandler,createCampaign,
        deleteCampaign,getCampaignById,
        acceptRequestHandler, updateCampaign,
        registerCampaign} from '../controllers/campaigns.controller.js'

const campaignRoutes = express.Router()

campaignRoutes.post('/', adminValidator,wrapRequestHandler(createCampaign))

campaignRoutes.get('/',wrapRequestHandler(getListCampaigns))

campaignRoutes.delete('/:campaignId',adminValidator ,wrapRequestHandler(deleteCampaign))

campaignRoutes.get('/:campaignId', wrapRequestHandler(getCampaignById))

campaignRoutes.put('/:campaignId', adminValidator, wrapRequestHandler(updateCampaign));

campaignRoutes.post(
  '/:campaignId/register',
  accessTokenValidator,
  wrapRequestHandler(registerCampaign)
);

campaignRoutes.get(
  '/:id/volunteers',
  accessTokenValidator,
  adminValidator,
  wrapRequestHandler(getCampaignVolunteers)
);

campaignRoutes.post('/:campaignId/accept/:userId', accessTokenValidator, adminValidator, wrapRequestHandler(acceptRequestHandler))

campaignRoutes.put('/:campaignId/start', adminValidator, wrapRequestHandler(startCampaignHandler));

export default campaignRoutes
