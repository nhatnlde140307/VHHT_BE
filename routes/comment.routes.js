import express from 'express';
import { accessTokenValidator } from '../middlewares/users.middlewares.js';
import { wrapRequestHandler } from '../utils/handlers.js';
import { createComment,getComments,deleteComment,downvoteComment, upvoteComment} from '../controllers/comment.controller.js';

const commentRouter = express.Router();

commentRouter.post('/', accessTokenValidator, wrapRequestHandler(createComment));

commentRouter.delete('/:id', accessTokenValidator, wrapRequestHandler(deleteComment));

commentRouter.get('/', wrapRequestHandler(getComments));

commentRouter.post('/:id/upvote', accessTokenValidator, wrapRequestHandler(upvoteComment));

commentRouter.post('/:id/downvote', accessTokenValidator, wrapRequestHandler(downvoteComment));

export default commentRouter;