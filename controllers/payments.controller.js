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
      embed_data: JSON.stringify({ redirecturl: `${process.env.FRONTEND_URL}/${donationCampaignId || 'general'}`, donationCampaignId, userId }),
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
      result.return_code = -1;
      result.return_message = "MAC không hợp lệ";
    } else {
      const dataJson = JSON.parse(dataStr);
      const app_trans_id = dataJson["app_trans_id"];
      const embed_data = JSON.parse(dataJson.embed_data);
      const donationCampaignId = embed_data.donationCampaignId;

      // ✅ Cập nhật trạng thái đơn giao dịch
      const updated = await DonationTransaction.findOneAndUpdate(
        { transactionCode: app_trans_id },
        { paymentStatus: "success" },
        { new: true }
      );

      await DonationCampaign.findByIdAndUpdate(
        donationCampaignId,
        { $inc: { currentAmount: dataJson['amount'] } },
        { new: true }
      );

      if (updated) {
        console.log("✅ Đã cập nhật đơn ủng hộ:", app_trans_id);
        result.return_code = 1;
        result.return_message = "Thành công";
        const room = `donate-campaign-${donationCampaignId}`;

        // Emit socket tới frontend
        const io = getIO();
        io.to(room).emit("new_donation", {
          transaction: updated,
          currentAmount: dataJson.amount,
          campaignId: donationCampaignId,
        });

          try {
            const userId = embed_data.userId;
            const user = await User.findById(userId);
            const campaign = await DonationCampaign.findById(donationCampaignId);

            await aiServive.sendDonationSuccessEmail(user.email, {
              donorName: user.fullName,
              amount: dataJson.amount,
              transactionCode: dataJson.app_trans_id,
              campaignTitle: campaign.title,
              date: new Date(dataJson.app_time).toLocaleString('vi-VN')  
            });

            console.log(`✅ Đã gửi email xác nhận đến ${user.email}`);
          } catch (mailErr) {
            console.error("❌ Lỗi khi gửi email xác nhận:", mailErr.message);
          }

      } else {
        result.return_code = 0;
        result.return_message = "Không tìm thấy đơn giao dịch";
      }
    }
  } catch (error) {
    result.return_code = 0;
    result.return_message = error.message;
  }

  res.json(result);
};