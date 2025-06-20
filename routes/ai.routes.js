import express from 'express'
import { wrapRequestHandler } from '../utils/handlers.js'
import { generateContentController } from '../controllers/ai.controller.js'
import axios from 'axios'
import aiServive from '../services/ai.servive.js'
import path from 'path';
import fs from 'fs';
import { cloudinary } from '../utils/cloudinary.config.js';


const aiRouter = express.Router()

aiRouter.post('/generate-content', wrapRequestHandler(generateContentController))

aiRouter.post('/sendDonationSuccessEmail', async (req, res) => {
  try {
    const {
      toEmail,
      donorName,
      amount,
      transactionCode,
      campaignTitle,
      date
    } = req.body;

    // 📤 Gửi email (không cần đính kèm file PDF)
    await aiServive.sendDonationSuccessEmail(toEmail, {
      donorName,
      amount,
      transactionCode,
      campaignTitle,
      date
    });

    res.json({ message: 'Đã gửi email xác nhận giao dịch thành công!' });
  } catch (error) {
    console.error('❌ Lỗi gửi mail:', error);
    res.status(500).json({ error: 'Gửi email thất bại', detail: error.message });
  }
});

export default aiRouter