import express from 'express'
import { wrapRequestHandler } from '../utils/handlers.js'
import {
  adminValidator,accessTokenValidator, loginValidator
} from '../middlewares/users.middlewares.js'
import { getListCampaigns } from '../controllers/campaigns.controller.js'

const campaignRoutes = express.Router()

campaignRoutes.get('/', adminValidator,wrapRequestHandler(getListCampaigns))

export default campaignRoutes
