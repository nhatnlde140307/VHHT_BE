import express from 'express'
import { wrapRequestHandler } from '../utils/handlers.js'
import {
  adminValidator,accessTokenValidator, loginValidator
} from '../middlewares/users.middlewares.js'
import { createNewsPost,listNewsPost,getNewsById,deleteNews,updateNews } from '../controllers/newsPost.controller.js'
import uploadCloud from '../utils/cloudinary.config.js'

const newsPostRoutes = express.Router()

newsPostRoutes.post('/', adminValidator, uploadCloud.array('images', 5), wrapRequestHandler(createNewsPost))

newsPostRoutes.get('/', wrapRequestHandler(listNewsPost))

newsPostRoutes.get('/:newsId', wrapRequestHandler(getNewsById))

newsPostRoutes.delete('/:id',adminValidator , wrapRequestHandler(deleteNews))

newsPostRoutes.put(
  '/:id',
  adminValidator,
  uploadCloud.array('images', 5), // field name là images[]
  wrapRequestHandler(updateNews)
)

export default newsPostRoutes
