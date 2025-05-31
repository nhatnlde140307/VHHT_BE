import express from 'express'
import { wrapRequestHandler } from '../utils/handlers.js'
import {
  adminValidator,accessTokenValidator, loginValidator
} from '../middlewares/users.middlewares.js'
import { getListCampaigns, createCampaign,deleteCampaign,getCampaignById } from '../controllers/campaigns.controller.js'

const campaignRoutes = express.Router()

campaignRoutes.post('/', adminValidator,wrapRequestHandler(createCampaign))

campaignRoutes.get('/',wrapRequestHandler(getListCampaigns))

campaignRoutes.delete('/:campaignId',adminValidator ,wrapRequestHandler(deleteCampaign))

campaignRoutes.get('/:campaignId', wrapRequestHandler(getCampaignById))

export default campaignRoutes
