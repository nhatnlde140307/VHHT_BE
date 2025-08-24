
import { wrapRequestHandler } from '../utils/handlers.js'
import { callbackZalopay, createOrderPaymentZaloPayController, createPaymentPayOS, handleWebhook } from '../controllers/payments.controller.js'
import express from 'express'
import { accessTokenValidator, optionalAuth } from '../middlewares/users.middlewares.js'
import payOS from '../utils/payOs.js'
import DonationTransaction from '../models/donationTransaction.model.js'
import DonationCampaign from '../models/donationCampaign.model.js'
import DonorProfile from '../models/donorProfile.model.js'
import usersServices from '../services/users.services.js';
import { getIO } from '../socket/socket.js';
import Notification from '../models/notification.model.js';

const paymentsRoutes = express.Router()

paymentsRoutes.post('/zalopay_payment_url', optionalAuth, wrapRequestHandler(createOrderPaymentZaloPayController))

paymentsRoutes.post('/zalopay_payment_url/callback', wrapRequestHandler(callbackZalopay))

// paymentsRoutes.post("/paymentPayOS", createPayment);

// paymentsRoutes.post("/webhookPayOS", handleWebhook);
paymentsRoutes.post("/webhookPayOS", async (req, res) => {
  try {
    console.log("📩 Webhook PayOS received:", req.body);

    let verified;
    try {
      verified = payOS.verifyPaymentWebhookData(req.body); 
      // ✅ verified chính là object data trong webhook
    } catch (err) {
      console.warn("Webhook không hợp lệ:", err.message);
      return res.status(200).json({ error: 1, message: "Webhook không hợp lệ" });
    }

    // ⚡ verified chính là data (không có .data nữa)
    const { orderCode, amount, description } = verified;

    // ✅ Update transaction
    const updatedTransaction = await DonationTransaction.findOneAndUpdate(
      { transactionCode: orderCode },
      { paymentStatus: "success" },
      { new: true }
    );

    if (!updatedTransaction) {
      console.warn("Không tìm thấy transaction:", orderCode);
      return res.status(200).json({ error: 1, message: "Không tìm thấy transaction" });
    }

    // ✅ Update campaign
    const campaign = await DonationCampaign.findByIdAndUpdate(
      updatedTransaction.donationCampaignId,
      { $inc: { currentAmount: amount } },
      { new: true }
    );

    if (!campaign) {
      console.warn("Không tìm thấy chiến dịch:", updatedTransaction.donationCampaignId);
      return res.status(200).json({ error: 1, message: "Không tìm thấy chiến dịch" });
    }

    // 🔄 Emit socket
    const io = getIO();
    io.to(`donate-campaign-${campaign._id}`).emit("new_donation", {
      transaction: updatedTransaction,
      currentAmount: campaign.currentAmount,
      campaignId: campaign._id,
    });

    // 📩 Notification
    const notifyDonation = await Notification.create({
      recipient: campaign.createdBy,
      title: `Có người vừa ủng hộ chiến dịch ${campaign.title}!`,
      content: `${updatedTransaction.donorName} vừa ủng hộ ${(+amount).toLocaleString()} VNĐ`,
      link: ``,
      type: "donation",
    });
    io.to(notifyDonation.recipient.toString()).emit("notification", notifyDonation);

    // // 🧠 Donor profile
    // await updateDonorProfile(
    //   updatedTransaction.userId,
    //   campaign,
    //   amount,
    //   orderCode,
    //   Date.now()
    // );

    // ✅ Trả về PayOS
    res.status(200).json({ error: 0, message: "Webhook processed successfully" });
  } catch (error) {
    console.error("Webhook PayOS Error:", error.message);
    res.status(200).json({
      error: 1,
      message: "Processed with error but acknowledged"
    });
  }
});


paymentsRoutes.post("/create", createPaymentPayOS);

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
