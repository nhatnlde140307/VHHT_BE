import Campaign from "../models/campaign.model.js";
import mongoose from "mongoose";
import { hashPassword } from "../utils/crypto.js";
import Department from "../models/departments.model.js";
import Phase from "../models/phase.model.js";
import PhaseDay from "../models/phaseDay.model.js";
import Task from "../models/task.model.js";
import { CAMPAIGN_MESSAGE } from "../constants/messages.js";
import User from "../models/users.model.js";
import { MailGenerator, transporter } from "../utils/nodemailerConfig.js";
import axios from "axios";
import aiServive from "./ai.servive.js";
import { generateCertificateAndUpload } from "./certificate.service.js";
import Certificate from "../models/certificate.model.js";
import { v2 as cloudinary } from "cloudinary";
import Category from "../models/category.model.js";
import { sendNotificationToUser } from "../socket/socket.js";
import Notification from "../models/notification.model.js";

class CampaignServices {
  async getListCampaigns(query) {
    try {
      const { sort, fields, page = 1, limit, all } = query; // Added 'all' parameter
      const queryObj = { ...query };
      const excludeFields = ["page", "sort", "limit", "fields", "all"]; // Include 'all' in excluded fields
      excludeFields.forEach((el) => delete queryObj[el]);

      if (queryObj.name) {
        queryObj.name = { $regex: queryObj.name, $options: "i" };
      }

      if (queryObj.certificatesIssued !== undefined) {
        queryObj.certificatesIssued = queryObj.certificatesIssued === "true";
      }

      let queryStr = JSON.stringify(queryObj);
      queryStr = queryStr.replace(
        /\b(gte|gt|lte|lt)\b/g,
        (match) => `$${match}`
      );

      let mongooseQuery = Campaign.find(JSON.parse(queryStr))
        .populate("createdBy", "fullname")
        .populate("departments", "name")
        .populate("categories", "name color icon")
        .populate("volunteers.user", "fullName email")
        .populate("phases")
        .lean();

      if (sort) {
        const sortBy = sort.split(",").join(" ");
        mongooseQuery = mongooseQuery.sort(sortBy);
      } else {
        mongooseQuery = mongooseQuery.sort("-createdAt");
      }

      if (fields) {
        const selectFields = fields.split(",").join(" ");
        mongooseQuery = mongooseQuery.select(selectFields);
      }

      // Apply pagination only if 'all' is not true and limit is provided
      let campaigns;
      let total;
      let totalPages;
      let currentPage = parseInt(page);

      if (all !== "true") {
        const effectiveLimit = parseInt(limit) || 10; // Default limit to 10 if not specified
        const skip = (page - 1) * effectiveLimit;
        mongooseQuery = mongooseQuery.skip(skip).limit(effectiveLimit);
        campaigns = await mongooseQuery;
        total = await Campaign.countDocuments(JSON.parse(queryStr));
        totalPages = Math.ceil(total / effectiveLimit);
      } else {
        // Fetch all campaigns if all=true
        campaigns = await mongooseQuery;
        total = campaigns.length; // Total is the length of fetched campaigns
        totalPages = 1; // No pagination when fetching all
        currentPage = 1;
      }

      return {
        campaigns,
        totalPages,
        currentPage,
        totalItems: total,
      };
    } catch (err) {
      throw new Error(`Failed to get campaign list: ${err.message}`);
    }
  }

  async getVolunteerListCampaigns(userId) {
    try {
      // Kiểm tra userId hợp lệ
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        const error = new Error("Invalid userId");
        error.status = 400;
        throw error;
      }

      // Truy vấn user với joinedCampaigns và phases
      const volunteer = await User.findById(userId).populate({
        path: "joinedCampaigns",
        select:
          "name description startDate endDate status location address image gallery",
        populate: {
          path: "phases",
          select: "name startDate endDate status",
        },
      });

      if (!volunteer) {
        const error = new Error("Volunteer not found");
        error.status = 404;
        throw error;
      }

      // Định dạng dữ liệu trả về
      const formattedCampaigns = volunteer.joinedCampaigns.map((campaign) => ({
        campaignId: campaign._id,
        name: campaign.name,
        description: campaign.description,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        status: campaign.status,
        location: {
          type: campaign.location?.type,
          coordinates: campaign.location?.coordinates,
          address: campaign.location?.address,
        },
        image: campaign.image,
        gallery: campaign.gallery,
        phases: campaign.phases.map((phase) => ({
          phaseId: phase._id,
          name: phase.name,
          startDate: phase.startDate,
          endDate: phase.endDate,
          status: phase.status,
        })),
      }));

      return {
        listCampaign: formattedCampaigns,
      };
    } catch (err) {
      const error = new Error(
        `Failed to get volunteer campaign list: ${err.message}`
      );
      error.status = err.status || 500;
      throw error;
    }
  }

  // Hàm trước đó (getTasksByUserAndCampaign) giữ nguyên
  static async getTasksByUserAndCampaign(userId, campaignId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      const error = new Error("Invalid userId");
      error.status = 400;
      throw error;
    }
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      const error = new Error("Invalid campaignId");
      error.status = 400;
      throw error;
    }

    const phases = await Phase.find({ campaignId }).select("_id");
    if (!phases || phases.length === 0) {
      const error = new Error("No phases found for this campaign");
      error.status = 404;
      throw error;
    }

    const phaseIds = phases.map((phase) => phase._id);
    const phaseDays = await PhaseDay.find({
      phaseId: { $in: phaseIds },
    }).select("_id");
    if (!phaseDays || phaseDays.length === 0) {
      const error = new Error("No phase days found for this campaign");
      error.status = 404;
      throw error;
    }

    const phaseDayIds = phaseDays.map((phaseDay) => phaseDay._id);
    const tasks = await Task.find({
      "assignedUsers.userId": userId,
      phaseDayId: { $in: phaseDayIds },
    })
      .populate({
        path: "phaseDayId",
        select: "date checkinLocation status",
        populate: {
          path: "phaseId",
          select: "name startDate endDate status campaignId",
          populate: {
            path: "campaignId",
            select: "name startDate endDate status",
          },
        },
      })
      .select("title description status checkinTime checkoutTime");

    if (!tasks || tasks.length === 0) {
      const error = new Error(
        "No tasks found for this user in the specified campaign"
      );
      error.status = 404;
      throw error;
    }

    const formattedTasks = tasks.map((task) => ({
      taskId: task._id,
      title: task.title,
      description: task.description,
      status: task.status.status,
      submittedAt: task.status.submittedAt,
      feedback: task.status.feedback,
      evaluation: task.status.evaluation,
      checkinTime: task.assignedUsers.find(
        (user) => user.userId.toString() === userId
      )?.checkinTime,
      checkoutTime: task.assignedUsers.find(
        (user) => user.userId.toString() === userId
      )?.checkoutTime,
      phaseDay: {
        date: task.phaseDayId?.date,
        location: task.phaseDayId?.checkinLocation,
        status: task.phaseDayId?.status,
      },
      phase: {
        name: task.phaseDayId?.phaseId?.name,
        startDate: task.phaseDayId?.phaseId?.startDate,
        endDate: task.phaseDayId?.phaseId?.endDate,
        status: task.phaseDayId?.phaseId?.status,
      },
      campaign: {
        name: task.phaseDayId?.phaseId?.campaignId?.name,
        startDate: task.phaseDayId?.phaseId?.campaignId?.startDate,
        endDate: task.phaseDayId?.phaseId?.campaignId?.endDate,
        status: task.phaseDayId?.phaseId?.campaignId?.status,
      },
    }));

    return formattedTasks;
  }

  async createCampaign(data, userId, campaignImg, gallery) {
    try {
      const {
        name,
        description,
        location,
        startDate,
        endDate,
        image,
        categories,
        acceptStatus,
      } = data;

      if (!name || !description || !startDate || !endDate) {
        const error = new Error(
          "Thiếu các trường bắt buộc: name, description, startDate, endDate"
        );
        error.status = 400;
        throw error;
      }

      let parsedLocation = location;
      if (typeof location === "string") {
        try {
          parsedLocation = JSON.parse(location);
        } catch {
          const error = new Error(
            "location phải là object hoặc JSON string hợp lệ"
          );
          error.status = 400;
          throw error;
        }
      }

      if (
        !parsedLocation?.coordinates ||
        !Array.isArray(parsedLocation.coordinates) ||
        parsedLocation.coordinates.length !== 2
      ) {
        const error = new Error("Location phải chứa coordinates [lng, lat]");
        error.status = 400;
        throw error;
      }

      let parsedCategories = categories;

      if (typeof categories === "string") {
        try {
          const parsed = JSON.parse(categories);
          if (Array.isArray(parsed)) {
            parsedCategories = parsed;
          } else {
            parsedCategories = categories.split(",").map((id) => id.trim());
          }
        } catch {
          parsedCategories = categories.split(",").map((id) => id.trim());
        }
      } else if (!Array.isArray(categories)) {
        parsedCategories = [categories];
      }

      const categoryObjectIds = parsedCategories.map(
        (id) => new mongoose.Types.ObjectId(id)
      );

      const campaign = new Campaign({
        name,
        description,
        location: {
          type: "Point",
          coordinates: parsedLocation.coordinates,
          address: parsedLocation.address,
        },
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        image: campaignImg,
        categories: categoryObjectIds,
        createdBy: new mongoose.Types.ObjectId(userId),
        status: "upcoming",
        acceptStatus: acceptStatus || "pending",
        gallery,
      });

      await campaign.save();
      return campaign;
    } catch (err) {
      console.error("❌ Lỗi trong service createCampaign:", err);
      throw err;
    }
  }

  async deleteCampaign(campaignId) {
    try {
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        const error = new Error("Không tìm thấy chiến dịch");
        error.status = 404;
        throw error;
      }

      if (campaign.image) {
        const publicId = image.includes("http")
          ? getPublicIdFromUrl(image)
          : image;

        await cloudinary.uploader.destroy(publicId);
      }

      if (Array.isArray(campaign.gallery)) {
        for (const img of campaign.gallery) {
          const publicId = img.includes("http")
            ? aiServive.getPublicIdFromUrl(img)
            : img;
          await cloudinary.uploader.destroy(publicId);
        }
      }

      await campaign.deleteOne();

      return {
        message: CAMPAIGN_MESSAGE.DELETE_CAMPAIGN_SUCCESS,
      };
    } catch (err) {
      console.error("❌ Lỗi khi xoá campaign:", err);
      throw new Error(`Xoá chiến dịch thất bại: ${err.message}`);
    }
  }

  async getCampaignById(campaignId) {
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      const error = new Error("ID chiến dịch không hợp lệ");
      error.status = 400;
      throw error;
    }

    // Lấy campaign kèm populate cơ bản
    const campaign = await Campaign.findById(campaignId)
      .populate("categories")
      .populate("createdBy", "name email")
      .populate("departments")
      .populate({
        path: "phases",
        populate: {
          path: "phaseDays",
          populate: {
            path: "tasks",
            model: "Task",
          },
        },
      })
      .populate("volunteers.user", "name email")
      .lean();

    if (!campaign) {
      const error = new Error("Không tìm thấy chiến dịch");
      error.status = 404;
      throw error;
    }
    const phases = await Phase.find({
      _id: { $in: campaign.phases.map((p) => p._id) },
    }).lean();

    for (const phase of phases) {
      const phaseDays = await PhaseDay.find({ phaseId: phase._id }).lean();
      for (const day of phaseDays) {
        const tasks = await Task.find({ phaseDayId: day._id }).lean();
        day.tasks = tasks;
      }
      phase.phaseDays = phaseDays;
    }

    campaign.phases = phases;

    return campaign;
  }

  async updateCampaign(campaignId, payload, campaignImg, gallery) {
    try {
      if (!mongoose.Types.ObjectId.isValid(campaignId)) {
        throw new Error("ID chiến dịch không hợp lệ");
      }
      console.log(campaignImg);
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        throw new Error("Không tìm thấy chiến dịch");
      }

      const fields = [
        "name",
        "description",
        "startDate",
        "endDate",
        "location",
        "phases",
        "image",
        "categories",
      ];

      if (payload.location) {
        const { type, coordinates } = payload.location;
        if (
          type !== "Point" ||
          !Array.isArray(coordinates) ||
          coordinates.length !== 2
        ) {
          throw new Error(
            "Sai định dạng location: { type: 'Point', coordinates: [lng, lat] }"
          );
        }
      }

      fields.forEach((field) => {
        if (payload[field] !== undefined) {
          campaign[field] = payload[field];
        }
      });

      if (typeof campaignImg === "string" && campaignImg.trim() !== "") {
        campaign.image = campaignImg;
      }

      // if (Array.isArray(gallery) && gallery.length > 0) {
      //   campaign.gallery = [...(campaign.gallery || []), ...gallery];
      // }
      if (Array.isArray(gallery) && gallery.length > 0) {
        campaign.gallery = gallery;
      }

      const updated = await campaign.save();
      return updated;
    } catch (err) {
      console.error("❌ [updateCampaign] Lỗi:", err);
      throw new Error(`Cập nhật chiến dịch thất bại: ${err.message}`);
    }
  }

  async approveCampaign(campaignId) {
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      throw new Error("ID chiến dịch không hợp lệ");
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      throw new Error("Không tìm thấy chiến dịch để phê duyệt");
    }

    if (campaign.acceptStatus === "approved") {
      throw new Error("Chiến dịch đã được duyệt trước đó rồi");
    }

    campaign.acceptStatus = "approved";
    campaign.approvedAt = new Date();

    await campaign.save();
    return campaign;
  }

  async rejectCampaign(campaignId, reason) {
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      throw new Error("ID chiến dịch không hợp lệ");
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      throw new Error("Không tìm thấy chiến dịch để từ chối");
    }

    if (campaign.acceptStatus === "rejected") {
      throw new Error("Chiến dịch đã bị từ chối trước đó");
    }

    campaign.acceptStatus = "rejected";
    campaign.rejectedAt = new Date();
    campaign.rejectionReason = reason || "Không có lý do cụ thể";

    await campaign.save();
    return campaign;
  }

  async registerCampaign({ campaignId, userId }) {
    try {
      if (!mongoose.Types.ObjectId.isValid(campaignId)) {
        throw new Error("Invalid campaign ID");
      }

      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        throw new Error("Campaign not found");
      }

      const already = campaign.volunteers.find(
        (v) => v.user.toString() === userId
      );
      if (already) {
        throw new Error("You have already registered");
      }

      campaign.volunteers.push({ user: userId });
      await campaign.save();

      return { message: "Registration submitted, waiting for admin approval" };
    } catch (err) {
      throw new Error(`Failed to register: ${err.message}`);
    }
  }

  async getCampaignVolunteers(campaignId, statusFilter = null) {
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      throw new Error("Invalid campaign ID");
    }

    const campaign = await Campaign.findById(campaignId).populate({
      path: "volunteers.user",
      select: "fullName email phone",
    });

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    let volunteers = campaign.volunteers;

    // ?status=pending
    if (statusFilter) {
      volunteers = volunteers.filter((v) => v.status === statusFilter);
    }

    return {
      volunteers,
      total: volunteers.length,
    };
  }

  async acceptVolunteerInCampaign({ campaignId, userId }) {
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) throw new Error("Không tìm thấy chiến dịch");

    const volunteer = campaign.volunteers.find(
      (v) => v.user.toString() === userId
    );
    if (!volunteer) throw new Error("Người dùng chưa đăng ký chiến dịch này");

    if (volunteer.status === "approved") {
      throw new Error("Người dùng đã được duyệt trước đó");
    }

    volunteer.status = "approved";
    await campaign.save();

    const user = await User.findById(userId);
    if (!user) throw new Error("Không tìm thấy người dùng");

    await User.findByIdAndUpdate(userId, {
      $addToSet: { joinedCampaigns: campaignId }
    });

    // Gửi email (giữ nguyên code gốc, nhưng move user fetch lên trên để reuse)
    if (user) {
      const emailContent = {
        body: {
          name: user.fullName || user.email,
          intro: `Bạn đã được duyệt tham gia chiến dịch "${campaign.name
            }" bắt đầu từ ngày ${campaign.startDate.toLocaleDateString()}.`,
          outro:
            "Nếu bạn không đăng ký chiến dịch này, vui lòng bỏ qua email này.",
        },
      };

      const mailBody = MailGenerator.generate(emailContent);

      await transporter.sendMail({
        from: process.env.EMAIL,
        to: user.email,
        subject: "Xác nhận tham gia chiến dịch - VHHT",
        html: mailBody,
      });
    }

    // Tạo và lưu notification vào DB, rồi gửi socket
    const newNotification = new Notification({
      title: "Đăng ký chiến dịch được duyệt", // Title ngắn gọn
      content: `Bạn đã được duyệt tham gia chiến dịch "${campaign.name
        }" bắt đầu từ ngày ${campaign.startDate.toLocaleDateString()}.`, // Content chi tiết
      link: `/campaigns/${campaign._id}`, // Link ví dụ đến campaign detail page (adjust nếu frontend khác)
      type: "campaign_approved",
      recipient: userId,
      // isRead default false, createdAt default Date.now
    });
    await newNotification.save();

    // Gửi socket với full notification object
    sendNotificationToUser(userId, newNotification);

    return {
      campaign: campaign.name,
      user: user?.fullName || "N/A",
      status: "approved",
    };
  }

  async rejectVolunteerInCampaign({ campaignId, userId }) {
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) throw new Error("Không tìm thấy chiến dịch");

    const volunteer = campaign.volunteers.find(
      (v) => v.user.toString() === userId
    );
    if (!volunteer) throw new Error("Người dùng chưa đăng ký chiến dịch này");

    if (volunteer.status === "rejected") {
      throw new Error("Người dùng đã bị từ chối trước đó");
    }

    volunteer.status = "rejected";
    await campaign.save();

    const volunteerId = await User.findById(userId);
    volunteerId.joinedCampaigns.push(campaignId);
    await volunteerId.save();

    const user = await User.findById(userId);
    if (user) {
      const emailContent = {
        body: {
          name: user.fullName || user.email,
          intro: `Bạn đã bị từ chối tham gia chiến dịch "${campaign.name}.`,
          outro:
            "Nếu bạn không đăng ký chiến dịch này, vui lòng bỏ qua email này.",
        },
      };

      const mailBody = MailGenerator.generate(emailContent);

      await transporter.sendMail({
        from: process.env.EMAIL,
        to: user.email,
        subject: "Xác nhận tham gia chiến dịch - VHHT",
        html: mailBody,
      });
    }

    return {
      campaign: campaign.name,
      user: user?.fullName || "N/A",
      status: "rejected",
    };
  }

  async startCampaign(campaignId) {
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      throw new Error("Invalid campaign ID");
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    if (campaign.status !== "upcoming") {
      throw new Error("Only upcoming campaigns can be started");
    }

    campaign.status = "in-progress";
    await campaign.save();

    try {
      const content = await aiServive.generateCampaignContent({
        title: campaign.name,
        description: campaign.description,
        location: campaign.location?.address,
        startDate: campaign.startDate.toLocaleDateString(),
        endDate: campaign.endDate.toLocaleDateString(),
        tone: "truyền cảm hứng",
      });
      console.log(content);

      await axios.post(
        "https://hooks.zapier.com/hooks/catch/23147694/2v3x9r1/",
        {
          title: campaign.name,
          content,
          startDate: campaign.startDate.toLocaleDateString(),
          image: campaign.image,
          link: `https://your-site.com/campaigns/${campaign._id}`,
        }
      );
    } catch (zapErr) {
      console.error("❌ Zapier or AI failed:", zapErr.message);
    }
    return campaign;
  }

  generateCode() {
    return Math.random().toString(36).slice(2, 10).toUpperCase();
  }

  async endCampaignAndIssueCertificates(
    campaignId,
    generateCertificate = true,
    mail = false
  ) {
    const campaign = await Campaign.findById(campaignId).populate(
      "volunteers.user"
    );
    if (!campaign) throw new Error("Không tìm thấy chiến dịch");

    if (campaign.status === "completed") {
      throw new Error("Chiến dịch đã kết thúc trước đó");
    }

    if (generateCertificate && campaign.certificatesIssued) {
      throw new Error("Chiến dịch này đã được cấp chứng chỉ trước đó");
    }

    campaign.status = "completed";
    const issuedCertificates = [];

    for (const v of campaign.volunteers) {
      if (v.status !== "approved" || !v.user) continue;

      const isPoor = v.evaluation === "poor";
      let fileUrl = null;

      //  Cấp chứng chỉ nếu không bị đánh giá poor
      if (generateCertificate && !isPoor) {
        const verifyCode = this.generateCode();
        fileUrl = await generateCertificateAndUpload({
          name: v.user.fullName,
          campaign: campaign.name,
          date: new Date().toLocaleDateString("vi-VN"),
          code: verifyCode,
        });

        const cert = await Certificate.create({
          volunteerId: v.user._id,
          campaignId: campaign._id,
          verifyCode,
          fileUrl,
        });

        issuedCertificates.push(cert);
      }

      //  Gửi email nếu cần
      if (mail) {
        try {
          const recipientName = v.user.fullName || v.user.email;

          let introText = "";
          let action = null;
          let subject = "";

          if (isPoor) {
            subject = `Kết quả tham gia chiến dịch "${campaign.name}"`;
            introText = `
                                Chào ${recipientName},

                            Cảm ơn bạn đã tham gia chiến dịch "${campaign.name}". Dù bạn đã có mặt xuyên suốt chương trình, tuy nhiên kết quả đánh giá không đủ điều kiện để được cấp chứng chỉ hoàn thành.

                            Hy vọng bạn sẽ tiếp tục đồng hành và đóng góp tích cực hơn trong các chiến dịch tiếp theo.

                                        Trân trọng,
                                        Đội ngũ VHHT
                                            `.trim();
          } else {
            subject = `Cảm ơn bạn đã tham gia chiến dịch "${campaign.name}"`;
            switch (v.evaluation) {
              case "excellent":
                introText = `Bạn được đánh giá là một tình nguyện viên xuất sắc. Chúng tôi vô cùng trân trọng sự đóng góp của bạn trong chiến dịch "${campaign.name}".`;
                break;
              case "good":
                introText = `Bạn đã hoàn thành nhiệm vụ rất tốt trong chiến dịch "${campaign.name}". Cảm ơn bạn đã đồng hành.`;
                break;
              case "average":
                introText = `Bạn đã hoàn thành nhiệm vụ ở mức khá trong chiến dịch "${campaign.name}". Mong bạn tiếp tục phát triển hơn nữa.`;
                break;
              default:
                introText = `Cảm ơn bạn đã tham gia chiến dịch "${campaign.name}".`;
            }

            if (fileUrl) {
              action = {
                instructions:
                  "Bạn có thể tải chứng chỉ tham gia tại liên kết sau:",
                button: {
                  color: "#22BC66",
                  text: "Xem chứng chỉ",
                  link: fileUrl,
                },
              };
            }
          }

          const mailBody = MailGenerator.generate({
            body: {
              name: recipientName,
              intro: introText,
              ...(action && { action }),
              outro: "Trân trọng cảm ơn bạn một lần nữa!",
            },
          });

          await transporter.sendMail({
            from: process.env.EMAIL,
            to: v.user.email,
            subject,
            html: mailBody,
          });
        } catch (emailErr) {
          console.error(
            `❌ Gửi email thất bại cho ${v.user.email}:`,
            emailErr.message
          );
        }
      }
    }

    if (generateCertificate) {
      campaign.certificatesIssued = true;
    }

    await campaign.save();
    return issuedCertificates;
  }

  async evaluateVolunteerInCampaign({ campaignId, userId, evaluation, feedback }) {
    if (!mongoose.Types.ObjectId.isValid(campaignId) || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid campaignId or userId");
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) throw new Error("Không tìm thấy chiến dịch");

    const volunteer = campaign.volunteers.find(v => v.user.toString() === userId);
    if (!volunteer) throw new Error("Tình nguyện viên không thuộc chiến dịch này");

    volunteer.evaluation = evaluation || 'average';
    volunteer.feedback = feedback || '';

    await campaign.save();

    return {
      message: 'Đánh giá thành công',
      userId,
      evaluation: volunteer.evaluation,
      feedback: volunteer.feedback
    };
  }

  async withdrawFromCampaign({ campaignId, userId }) {
    if (!mongoose.Types.ObjectId.isValid(campaignId) || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid campaignId or userId");
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) throw new Error("Không tìm thấy chiến dịch");

    // 1. Xoá user khỏi campaign.volunteers
    campaign.volunteers = campaign.volunteers.filter(v => v.user.toString() !== userId);
    await campaign.save();

    // 2. Xoá campaignId khỏi user.joinedCampaigns
    await User.findByIdAndUpdate(userId, {
      $pull: { joinedCampaigns: campaignId }
    });

    // 3. Lấy các phase thuộc campaign
    const phases = await Phase.find({ campaignId }).select("_id");
    const phaseIds = phases.map(p => p._id);

    // 4. Lấy các phaseDay thuộc phase
    const phaseDays = await PhaseDay.find({ phaseId: { $in: phaseIds } }).select("_id");
    const phaseDayIds = phaseDays.map(p => p._id);

    // 5. Xoá user khỏi các task đang in_progress
    await Task.updateMany(
      {
        phaseDayId: { $in: phaseDayIds },
        status: 'in_progress'
      },
      {
        $pull: { assignedUsers: { userId } }
      }
    );

    return { message: "Rút lui khỏi chiến dịch thành công" };
  }
}

const campaignServices = new CampaignServices();
export default campaignServices;
