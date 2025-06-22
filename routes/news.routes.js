import express from 'express'
import { wrapRequestHandler } from '../utils/handlers.js'
import {
  adminValidator,accessTokenValidator, AdminOrganizationAndManagerValidator
} from '../middlewares/users.middlewares.js'
import { createNewsPost,listNewsPost,getNewsById,deleteNews,updateNews,downvoteNewsPost, upvoteNewsPost } from '../controllers/newsPost.controller.js'
import uploadCloud from '../utils/cloudinary.config.js'

const newsPostRoutes = express.Router()

newsPostRoutes.post('/', AdminOrganizationAndManagerValidator, uploadCloud.array('images', 5), wrapRequestHandler(createNewsPost))

newsPostRoutes.get('/', wrapRequestHandler(listNewsPost))

newsPostRoutes.get('/:newsId', wrapRequestHandler(getNewsById))

newsPostRoutes.delete('/:id',adminValidator , wrapRequestHandler(deleteNews))

newsPostRoutes.post('/:id/upvote', accessTokenValidator, wrapRequestHandler(upvoteNewsPost));

newsPostRoutes.post('/:id/downvote', accessTokenValidator, wrapRequestHandler(downvoteNewsPost));

newsPostRoutes.put(
  '/:id',
  adminValidator,
  uploadCloud.array('images', 5), 
  wrapRequestHandler(updateNews)
)

export default newsPostRoutes
