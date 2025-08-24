import DonationTransaction from '../models/donationTransaction.model.js';
import DonationCampaign from '../models/donationCampaign.model.js';
import crypto from "crypto";
import querystring from "qs";
import axios from 'axios';
import moment from 'moment';
import CryptoJS from "crypto-js";
import { config } from 'dotenv'
import { getIO } from '../socket/socket.js';
import User from '../models/users.model.js';
import aiServive from '../services/ai.servive.js';
import usersServices from '../services/users.services.js';
import DonorProfile from '../models/donorProfile.model.js'
import Notification from '../models/notification.model.js';
import { log } from 'console';
import payOS from '../utils/payOs.js';


config()

export const createOrderPaymentZaloPayController = async (req, res) => {
  try {
    const { donationCampaignId, guestName, amount, message, anonymous } = req.body;

    let donorName = "Ẩn danh";
    let userId = null;

    if (req.decoded_authorization) {
      userId = req.decoded_authorization.user_id;
      const user = await User.findById(userId);
      donorName = anonymous ? "Nhà hảo tâm ẩn danh" : user.fullName;
    } else {
      // Guest
      donorName = anonymous || !guestName ? "Nhà hảo tâm ẩn danh" : guestName.trim();
    }

    if (!amount || amount < 1000) {
      return res.status(400).json({ error: "Thiếu thông tin người ủng hộ hoặc số tiền không hợp lệ" });
    }

    const config = {
      app_id: "2553",
      key1: process.env.ZALOPAY_KEY1,
      key2: process.env.ZALOPAY_KEY2,
      endpoint: process.env.ZALOPAY_ENDPOINT,
    };

    const transID = Math.floor(Math.random() * 1000000);
    const app_trans_id = `${moment().format("YYMMDD")}_${transID}`;
    const totalAmount = amount;

    const order = {
      app_id: config.app_id,
      app_trans_id,
      app_user: donorName || "anonymous-donor",
      app_time: Date.now(),
      item: JSON.stringify([{ name: "Ủng hộ chiến dịch", amount }]),
      embed_data: JSON.stringify({ redirecturl: `${process.env.FRONTEND_URL}/thankyou`, donationCampaignId, userId }),
      amount: totalAmount,
      description: `Ủng hộ chiến dịch #${donationCampaignId || 'Chung'}`,
      bank_code: "",
      callback_url: `${process.env.NGROK_4000}/payments/zalopay_payment_url/callback`,
    };

    const data = `${config.app_id}|${order.app_trans_id}|${order.app_user}|${order.amount}|${order.app_time}|${order.embed_data}|${order.item}`;
    order.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

    const response = await axios.post(config.endpoint, null, { params: order });

    // ✅ Tạo bản ghi transaction trong MongoDB
    const transaction = new DonationTransaction({
      donationCampaignId: donationCampaignId || null,
      userId: userId || null,
      donorName,
      anonymous,
      amount,
      message,
      paymentMethod: "ZaloPay",
      paymentStatus: "pending",
      transactionCode: app_trans_id
    });

    await transaction.save();

    res.json({
      message: "Khởi tạo thanh toán ZaloPay thành công",
      data: response.data
    });

  } catch (error) {
    console.error("ZaloPay Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Lỗi khi khởi tạo thanh toán", details: error.message });
  }
};

export const callbackZalopay = async (req, res) => {
  const config = {
    key2: process.env.ZALOPAY_KEY2,
  };

  let result = {};

  try {
    const dataStr = req.body.data;
    const reqMac = req.body.mac;
    const mac = CryptoJS.HmacSHA256(dataStr, config.key2).toString();

    if (reqMac !== mac) {
      return res.json({
        return_code: -1,
        return_message: "MAC không hợp lệ",
      });
    }

    const dataJson = JSON.parse(dataStr);
    const {
      app_trans_id,
      app_user,
      amount,
      embed_data,
      app_time,
    } = dataJson;
    const embed = JSON.parse(embed_data);
    const campaignId = embed.donationCampaignId;
    const userId = embed.userId;

    const io = getIO();

    const campaign = await DonationCampaign.findById(campaignId);
    if (!campaign) throw new Error("Không tìm thấy chiến dịch");

    const updatedTransaction = await DonationTransaction.findOneAndUpdate(
      { transactionCode: app_trans_id },
      { paymentStatus: "success" },
      { new: true }
    );

    await DonationCampaign.findByIdAndUpdate(
      campaignId,
      { $inc: { currentAmount: amount } },
      { new: true }
    );

    if (updatedTransaction) {
      // 🔄 Emit update to donation room
      const room = `donate-campaign-${campaignId}`;
      io.to(room).emit("new_donation", {
        transaction: updatedTransaction,
        currentAmount: amount,
        campaignId: campaignId,
      });

      // 📩 Notify new donation
      const notifyDonation = await Notification.create({
        recipient: campaign.createdBy,
        title: `Có người vừa ủng hộ chiến dịch ${campaign.title}!`,
        content: `${app_user} vừa ủng hộ ${(+amount).toLocaleString()} VNĐ`,
        link: ``,
        type: "donation",
      });
      io.to(notifyDonation.recipient.toString()).emit("notification", notifyDonation);

      // 🧠 Update donor profile
      await updateDonorProfile(userId, campaign, amount, app_trans_id, app_time);

      // 🎯 Mục tiêu đạt được
      const refreshedCampaign = await DonationCampaign.findById(campaignId);
      if (refreshedCampaign.currentAmount >= refreshedCampaign.goalAmount) {
        const goalReachedNoti = await Notification.create({
          recipient: refreshedCampaign.createdBy,
          title: `Chúc mừng, chiến dịch ${refreshedCampaign.title} đã đạt mục tiêu gọi vốn 🎉!`,
          content: `Chiến dịch ${refreshedCampaign.title} đã đạt mức ủng hộ kì vọng ${refreshedCampaign.goalAmount.toLocaleString()} VNĐ`,
          link: ``,
          type: "donation",
        });
        io.to(goalReachedNoti.recipient.toString()).emit("notification", goalReachedNoti);
      }
      const prevAmount = refreshedCampaign.currentAmount - amount;
      if (
        prevAmount < refreshedCampaign.goalAmount * 0.5 &&
        refreshedCampaign.currentAmount >= refreshedCampaign.goalAmount * 0.5
      ) {
        const content = await aiServive.generatePushRaisingDonation({
          title: refreshedCampaign.title,
          goal: refreshedCampaign.goalAmount,
          currentAmount: refreshedCampaign.currentAmount,
          description: refreshedCampaign.description,
          tone: "gây xúc động",
          type: "kêu gọi ủng hộ thiện nguyện"
        });

        await axios.post("https://hooks.zapier.com/hooks/catch/23147694/2v3x9r1/", {
          title: refreshedCampaign.title,
          content,
          image: refreshedCampaign.thumbnail,
          link: `https://your-site.com/donation-campaigns/${updated._id}`,
        });
      }
      result = {
        return_code: 1,
        return_message: "Thành công",
      };
    } else {
      result = {
        return_code: 0,
        return_message: "Không tìm thấy đơn giao dịch",
      };
    }
  } catch (error) {
    console.error("❌ Lỗi callbackZalopay:", error);
    result = {
      return_code: 0,
      return_message: error.message,
    };
  }

  return res.json(result);
};

// 🧠 Cập nhật DonorProfile và gửi email xác nhận
const updateDonorProfile = async (userId, campaign, amount, transactionCode, timestamp) => {
  try {
    console.log("👤 userId:", userId);

    const user = await User.findById(userId);
    if (!user) {
      console.error("❌ Không tìm thấy user từ userId:", userId);
      return;
    };

    let donorProfile = await DonorProfile.findOne({ userId: user._id });
    if (!donorProfile) {
      donorProfile = await usersServices.createDonorProfile(user);
    }

    donorProfile.totalDonated += amount;

    const campaignIndex = donorProfile.donatedCampaigns.findIndex(
      (item) => item.campaignId.toString() === campaign._id.toString()
    );

    if (campaignIndex !== -1) {
      donorProfile.donatedCampaigns[campaignIndex].totalAmount += amount;
    } else {
      donorProfile.donatedCampaigns.push({
        campaignId: campaign._id,
        totalAmount: amount,
      });
    }

    await donorProfile.save();

    await aiServive.sendDonationSuccessEmail(user.email, {
      donorName: user.fullName,
      amount: amount,
      transactionCode: transactionCode,
      campaignTitle: campaign.title,
      date: new Date(timestamp).toLocaleString("vi-VN"),
    });
  } catch (err) {
    console.error("❌ Lỗi khi cập nhật DonorProfile hoặc gửi email:", err.message);
  }
};

const truncateDescription = (desc) => {
  if (!desc) return "Thanh toán";
  return desc.length > 25 ? desc.slice(0, 25) : desc;
};

export const createPaymentPayOS = async (req, res) => {
  try {
    const { donationCampaignId, guestName, amount, message, anonymous, buyerEmail, buyerPhone } = req.body;

    let donorName = "Ẩn danh";
    let userId = null;

    if (req.decoded_authorization) {
      userId = req.decoded_authorization.user_id;
      const user = await User.findById(userId);
      donorName = anonymous ? "Nhà hảo tâm ẩn danh" : user.fullName;
    } else {
      donorName = anonymous || !guestName ? "Nhà hảo tâm ẩn danh" : guestName.trim();
    }

    if (!amount || amount < 1000) {
      return res.status(400).json({ error: "Số tiền không hợp lệ" });
    }

    const orderCode = Number(String(new Date().getTime()).slice(-6));

    const body = {
      orderCode,
      amount,
      description: truncateDescription(`Ủng hộ chiến dịch #${donationCampaignId || "Chung"}`),
      returnUrl: `${process.env.FRONTEND_URL}/thankyou`,
      cancelUrl: `${process.env.FRONTEND_URL}/cancel`,
      buyerName: donorName,
      buyerEmail: buyerEmail || "guest@example.com",
      buyerPhone: buyerPhone || "0000000000",
      items: [{ name: "Ủng hộ chiến dịch", quantity: 1, price: amount }],
    };

    const paymentLinkRes = await payOS.createPaymentLink(body);

    // ✅ Lưu vào DB
    await DonationTransaction.create({
      donationCampaignId: donationCampaignId || null,
      userId: userId || null,
      donorName,
      anonymous,
      amount,
      message,
      paymentMethod: "PayOS",
      paymentStatus: "pending",
      transactionCode: orderCode
    });

    return res.json({
      error: 0,
      message: "Success",
      data: {
        bin: paymentLinkRes.bin,
        checkoutUrl: paymentLinkRes.checkoutUrl,
        accountNumber: paymentLinkRes.accountNumber,
        accountName: paymentLinkRes.accountName,
        amount: paymentLinkRes.amount,
        description: paymentLinkRes.description,
        orderCode: paymentLinkRes.orderCode,
        qrCode: paymentLinkRes.qrCode,
      },
    });
  } catch (error) {
    console.error("❌ PayOS Error:", error.message);
    return res.json({
      error: -1,
      message: "fail",
      data: null,
    });
  }
};

export const handleWebhook = async (req, res) => {
  try {
    const verified = payOS.verifyPaymentWebhookData(req.body);
    if (!verified.success) {
      return res.status(400).json({ error: "Webhook không hợp lệ" });
    }

    const { orderCode, amount, description } = verified;
    const io = getIO();

    // ✅ Update transaction
    const updatedTransaction = await DonationTransaction.findOneAndUpdate(
      { transactionCode: orderCode },
      { paymentStatus: "success" },
      { new: true }
    );

    if (!updatedTransaction) {
      return res.json({ error: 1, message: "Không tìm thấy transaction" });
    }

    // ✅ Update campaign
    const campaign = await DonationCampaign.findByIdAndUpdate(
      updatedTransaction.donationCampaignId,
      { $inc: { currentAmount: amount } },
      { new: true }
    );

    if (!campaign) throw new Error("Không tìm thấy chiến dịch");

    // 🔄 Emit socket
    const room = `donate-campaign-${campaign._id}`;
    io.to(room).emit("new_donation", {
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

    // 🧠 Update donor profile
    await updateDonorProfile(
      updatedTransaction.userId,
      campaign,
      amount,
      orderCode,
      Date.now()
    );

    return res.json({ success: true });
  } catch (error) {
    console.error("Webhook PayOS Error:", error.message);
    res.status(400).json({ error: error.message });
  }
};