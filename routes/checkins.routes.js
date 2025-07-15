import express from 'express'
import { wrapRequestHandler } from '../utils/handlers.js'
import { postCheckin } from "../controllers/checkin.controller.js";
import { getCheckinList } from "../controllers/checkin.controller.js";
import { accessTokenValidator } from '../middlewares/users.middlewares.js';

const checkinRoutes = express.Router()

checkinRoutes.post("/", wrapRequestHandler(postCheckin));

checkinRoutes.get("/:phasedayId", wrapRequestHandler(getCheckinList));

export default checkinRoutes
