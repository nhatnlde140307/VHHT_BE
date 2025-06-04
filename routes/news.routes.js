import express from 'express'
import { wrapRequestHandler } from '../utils/handlers.js'
import {
  adminValidator,accessTokenValidator, loginValidator
} from '../middlewares/users.middlewares.js'
import { createNewsPost } from '../controllers/newsPost.controller.js'
import uploadCloud from '../utils/cloudinary.config.js'

const newsPostRoutes = express.Router()

newsPostRoutes.post('/', adminValidator, uploadCloud.array('images', 5), wrapRequestHandler(createNewsPost))

export default newsPostRoutes
