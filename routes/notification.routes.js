import express from 'express';
import { getMyNotifications, markAsRead , sendTestNotification} from '../controllers/notification.controller.js';
import { accessTokenValidator } from '../middlewares/users.middlewares.js';


const notiRouter = express.Router();

//notiRouter.use(accessTokenValidator); 

notiRouter.get('/', accessTokenValidator,getMyNotifications);               
notiRouter.patch('/:id/read', markAsRead);   
notiRouter.get('/test', sendTestNotification);

export default notiRouter;