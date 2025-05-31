import express from 'express'
import { wrapRequestHandler } from '../utils/handlers.js'
import {
  adminValidator,accessTokenValidator, loginValidator
} from '../middlewares/users.middlewares.js'
import { getListCampaigns,getCampaignVolunteers, createCampaign,deleteCampaign,getCampaignById, updateCampaign,registerCampaign} from '../controllers/campaigns.controller.js'

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

export default campaignRoutes
