import express from 'express';
import * as StormController from '../controllers/storm.controller.js';

const stormRouter = express.Router();

stormRouter.post('/', StormController.createStorm);
stormRouter.get('/', StormController.getAllStorms);
stormRouter.get('/active', StormController.getActiveStorm);
stormRouter.patch('/:id/activate', StormController.activateStorm);
stormRouter.patch('/:id/deactivate', StormController.deactivateStorm);

export default stormRouter;
