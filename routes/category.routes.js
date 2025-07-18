import express from 'express'
import { wrapRequestHandler } from '../utils/handlers.js'
import {
  adminValidator,accessTokenValidator, AdminOrganizationAndManagerValidator
} from '../middlewares/users.middlewares.js'

import { getCategories } from '../controllers/category.controller.js'

const categoryRoutes = express.Router()

categoryRoutes.get('/', wrapRequestHandler(getCategories))


export default categoryRoutes
