import express from 'express';
import { accessTokenValidator } from '../middlewares/users.middlewares.js';
import { wrapRequestHandler } from '../utils/handlers.js';
import { createComment,getComments,deleteComment } from '../controllers/comment.controller.js';

const commentRouter = express.Router();

commentRouter.post('/', accessTokenValidator, wrapRequestHandler(createComment));

commentRouter.delete('/:id', accessTokenValidator, wrapRequestHandler(deleteComment));

commentRouter.get('/', wrapRequestHandler(getComments));

export default commentRouter;