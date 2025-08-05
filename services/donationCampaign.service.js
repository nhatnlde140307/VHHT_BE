import { config } from 'dotenv';
import DonationCampaign from '../models/donationCampaign.model.js';
import { MailGenerator, transporter } from '../utils/nodemailerConfig.js'
import DonorProfile from '../models/donorProfile.model.js';
import User from '../models/users.model.js';
import DonationTransaction from '../models/donationTransaction.model.js';
import mongoose from 'mongoose';
import aiServive from './ai.servive.js';
import axios from 'axios';
config();

class DonationServices {

    async create(images, thumbnail, data, userId) {
        const {
            title,
            description,
            goalAmount,
            tags = [],
            createdBy
        } = data;

        if (!title || !description || !goalAmount) {
            throw new Error('Thiếu trường bắt buộc');
        }

        const newCampaign = new DonationCampaign({
            title,
            description,
            goalAmount: Number(goalAmount),
            thumbnail: thumbnail,
            images: images,
            tags,
            createdBy: userId,
            currentAmount: 0
        });

        return await newCampaign.save();
    }

    async updateDonationCampaign(images, payload, thumbnail, donationCampaignId) {
        try {
            console.log('🖼️ Thumbnail path:', thumbnail);

            if (!mongoose.Types.ObjectId.isValid(donationCampaignId)) {
                throw new Error('ID chiến dịch không hợp lệ')
            }

            const campaign = await DonationCampaign.findById(donationCampaignId)
            if (!campaign) {
                throw new Error('Không tìm thấy chiến dịch')
            }

            const fields = [
                'title',
                'description',
                'goalAmount',
                'thumbnail',
                'images',
                'tags',
                'status'
            ]

            fields.forEach(field => {
                if (payload[field] !== undefined) {
                    campaign[field] = payload[field]
                }
            })

            if (thumbnail) {
                campaign.thumbnail = thumbnail;
            }

            if (Array.isArray(images) && images.length > 0) {
                campaign.images = [...(campaign.images || []), ...images]
            }

            const updated = await campaign.save()
            return updated
        } catch (err) {
            console.error('❌ [updateCampaign] Lỗi:', err)
            throw new Error(`Cập nhật chiến dịch thất bại: ${err.message}`)
        }
    }

    async approve(id, postFb = true) {
        const updated = await DonationCampaign.findByIdAndUpdate(
            id,
            { approvalStatus: 'approved' },
            { new: true }
        );

        if (!updated) {
            throw new Error('Không tìm thấy chiến dịch');
        }

        // ✅ Gửi email thông báo cho người tạo
        const creator = await User.findById(updated.createdBy);
        if (creator && creator.email) {
            const emailContent = {
                body: {
                    name: creator.name || creator.email,
                    intro: 'Chiến dịch quyên góp của tổ chức đã được phê duyệt.',
                    content: `Chiến dịch "${updated.title}" đã được admin xác nhận và sẽ hiển thị công khai.`,
                    outro: 'Nếu bạn không tạo chiến dịch này, vui lòng liên hệ lại VHHT.'
                }
            };
            const mailBody = MailGenerator.generate(emailContent);
            await transporter.sendMail({
                from: process.env.EMAIL,
                to: creator.email,
                subject: 'Chiến dịch của bạn đã được phê duyệt',
                html: mailBody
            });
        }

        // ✅ Nếu postFb === true → đăng bài lên mạng xã hội
        if (postFb) {
            try {
                const content = await aiServive.generateFundraisingContent({
                    title: updated.title,
                    goal: updated.goalAmount ? `${updated.goalAmount} VNĐ` : 'Không rõ',
                    description: updated.description,
                    tone: "gây xúc động",
                    type:"kêu gọi ủng hộ thiện nguyện"
                });

                await axios.post("https://hooks.zapier.com/hooks/catch/23147694/2v3x9r1/", {
                    title: updated.title,
                    content,
                    image: updated.thumbnail,
                    link: `https://your-site.com/donation-campaigns/${updated._id}`,
                });
            } catch (zapErr) {
                console.error("🚨 Lỗi đăng bài lên Zapier:", zapErr.message);
            }
        }

        return updated;
    }

    async reject(id) {
        const updated = await DonationCampaign.findByIdAndUpdate(
            id,
            { approvalStatus: 'rejected' },
            { new: true }
        );

        if (!updated) {
            throw new Error('Không tìm thấy chiến dịch');
        }

        const creator = await User.findById(updated.createdBy);
        if (creator && creator.email) {
            const emailContent = {
                body: {
                    name: creator.name || creator.email,
                    intro: 'Chiến dịch quyên góp của tổ chức đã bị từ chối.',
                    content: `Chiến dịch "${updated.title}" đã bị admin từ chối xác nhận sẽ không được chạy.`,
                    outro: 'Nếu bạn có bất kì câu hỏi nào, vui lòng liên hệ lại VHHT.'
                }
            };
            const mailBody = MailGenerator.generate(emailContent)

            await transporter.sendMail({
                from: process.env.EMAIL,
                to: creator.email,
                subject: 'Verify your VHHT account',
                html: mailBody
            })
        }

        return updated;
    }

    async getAll(query) {
        const {
            status = 'approved',
            search = '',
            tags,
            page = 1,
            limit = 10,
            sortBy = 'createdAt',
            order = 'desc'
        } = query;

        const filter = {}; // Không lọc theo approvalStatus nữa

        if (search) {
            filter.title = { $regex: search, $options: 'i' };
        }

        if (tags) {
            const tagList = Array.isArray(tags) ? tags : tags.split(',');
            filter.tags = { $in: tagList };
        }

        const sortOption = {};
        sortOption[sortBy] = order === 'asc' ? 1 : -1;

        const campaigns = await DonationCampaign.find(filter) // Không lọc theo approvalStatus
            .sort(sortOption)
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .populate('tags');

        const total = await DonationCampaign.countDocuments(filter);

        return {
            data: campaigns,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total
            }
        };
    }

    async getbyId(id) {
        const campaign = await DonationCampaign.findById(id)
            .populate('createdBy', 'fullName avatar')
            .populate('tags');

        if (!campaign) return null;

        const transactions = await DonationTransaction.find({
            donationCampaignId: id,
            paymentStatus: 'success'
        }).sort({ createdAt: -1 });

        return {
            campaign,
            transactions
        };
    }
    async completeCampaign(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('ID chiến dịch không hợp lệ');
    }

    const campaign = await DonationCampaign.findById(id);
    if (!campaign) {
        throw new Error('Không tìm thấy chiến dịch');
    }

    if (campaign.status === 'completed') {
        throw new Error('Chiến dịch đã kết thúc trước đó');
    }

    campaign.status = 'completed';
    const updated = await campaign.save();
    return updated;
}
}

export default new DonationServices();