import { wrapRequestHandler } from '../utils/handlers.js'
import { callbackZalopay,createOrderPaymentZaloPayController,createPaymentPayOS ,handleWebhook } from '../controllers/payments.controller.js'
import express from 'express'
import { accessTokenValidator, optionalAuth } from '../middlewares/users.middlewares.js'
import payOS from '../utils/payOs.js'

const paymentsRoutes = express.Router()

paymentsRoutes.post('/zalopay_payment_url',optionalAuth, wrapRequestHandler(createOrderPaymentZaloPayController))

paymentsRoutes.post('/zalopay_payment_url/callback', wrapRequestHandler(callbackZalopay))

// paymentsRoutes.post("/paymentPayOS", createPayment);

paymentsRoutes.post("/webhookPayOS", handleWebhook);

paymentsRoutes.post("/create",createPaymentPayOS);

paymentsRoutes.post("/confirm-webhook", async (req, res) => {
  try {
    const { webhookUrl } = req.body;

    if (!webhookUrl) {
      return res.status(400).json({ error: "Webhook URL is required" });
    }

    await payOS.confirmWebhook(webhookUrl);

    console.log("✅ Webhook đã đăng ký với PayOS:", webhookUrl);

    return res.json({
      error: 0,
      message: "Webhook registered successfully",
      data: { webhookUrl },
    });
  } catch (error) {
    console.error("❌ Error confirmWebhook:", error);
    return res.status(500).json({ error: error.message });
  }
});

export default paymentsRoutes
