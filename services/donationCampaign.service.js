import { config } from 'dotenv';
import DonationCampaign from '../models/donationCampaign.model.js';
import { MailGenerator, transporter } from '../utils/nodemailerConfig.js'
import DonorProfile from '../models/donorProfile.model.js';
import User from '../models/users.model.js';
import OrganizationInfo from '../models/organizationInfo.model.js';
import DonationTransaction from '../models/donationTransaction.model.js';

config();

class DonationServices {
    async create(images, data, userId) {
        const {
            title,
            description,
            goalAmount,
            thumbnail,
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
            thumbnail,
            images: images,
            tags,
            createdBy: userId,
            currentAmount: 0
        });

        return await newCampaign.save();
    }

    async approve(id) {
        const updated = await DonationCampaign.findByIdAndUpdate(
            id,
            { approvalStatus: 'approved' },
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
                    intro: 'Chiến dịch quyên góp của tổ chức đã được phê duyệt.',
                    content: `Chiến dịch "${updated.title}" đã được admin xác nhận và sẽ hiển thị công khai.`,
                    outro: 'Nếu bạn không tạo chiến dịch này, vui lòng liên hệ lại VHHT.'
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

        const filter = {
            approvalStatus: status
        };

        if (search) {
            filter.title = { $regex: search, $options: 'i' };
        }

        if (tags) {
            const tagList = Array.isArray(tags) ? tags : tags.split(',');
            filter.tags = { $in: tagList };
        }

        const sortOption = {};
        sortOption[sortBy] = order === 'asc' ? 1 : -1;

        const campaigns = await DonationCampaign.find(filter)
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
}

export default new DonationServices();