import express from 'express'
import { wrapRequestHandler } from '../utils/handlers.js'
import {
  adminValidator,accessTokenValidator, loginValidator
} from '../middlewares/users.middlewares.js'

import { getListCampaigns } from '../controllers/campaigns.controller.js'

const checkinRoutes = express.Router()

checkinRoutes.post('/', (req, res) => {
  const { lat, lng } = req.body;

  if (!lat || !lng) {
    console.warn("Thiếu tọa độ từ client.");
    return res.status(400).json({ message: "Thiếu tọa độ." });
  }

  console.log("📍 Tọa độ nhận được từ client:", { lat, lng });

  res.json({
    message: "Nhận tọa độ thành công.",
    location: {
      latitude: lat,
      longitude: lng
    }
  });
});

export default checkinRoutes
