import Campaign from '../models/campaign.model.js';
import mongoose from 'mongoose'
import { hashPassword } from '../utils/crypto.js'
import Department from '../models/departments.model.js';
import { CAMPAIGN_MESSAGE } from '../constants/messages.js';
import User from '../models/users.model.js';
import { MailGenerator, transporter } from '../utils/nodemailerConfig.js'
import axios from 'axios';
import aiServive from './ai.servive.js';


class CampaignServices {
    async getListCampaigns(query) {
        try {
            const { sort, fields, page = 1, limit = 10 } = query;
            const queryObj = { ...query };
            const excludeFields = ['page', 'sort', 'limit', 'fields'];
            excludeFields.forEach(el => delete queryObj[el]);

            // Search by name
            if (queryObj.name) {
                queryObj.name = { $regex: queryObj.name, $options: 'i' };
            }

            // Advanced filter operators
            let queryStr = JSON.stringify(queryObj);
            queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

            let mongooseQuery = Campaign.find(JSON.parse(queryStr))
                .populate('createdBy', 'fullname')
                .populate('departments', 'name')
                .populate('volunteerIds', 'fullname');

            // Sorting
            if (sort) {
                const sortBy = sort.split(',').join(' ');
                mongooseQuery = mongooseQuery.sort(sortBy);
            } else {
                mongooseQuery = mongooseQuery.sort('-createdAt'); // Sort theo ngày mới nhất
            }

            // Select fields
            if (fields) {
                const selectFields = fields.split(',').join(' ');
                mongooseQuery = mongooseQuery.select(selectFields);
            }

            // Pagination
            const skip = (page - 1) * limit;
            mongooseQuery = mongooseQuery.skip(skip).limit(limit);

            const campaigns = await mongooseQuery;
            const total = await Campaign.countDocuments(JSON.parse(queryStr));
            const totalPages = Math.ceil(total / limit);

            return {
                campaigns,
                totalPages,
                currentPage: parseInt(page),
                totalItems: total
            };
        } catch (err) {
            throw new Error(`Failed to get campaign list: ${err.message}`);
        }
    }

    async createCampaign(payload) {
        try {
            const {
                name,
                type,
                description,
                location,
                startDate,
                endDate,
                image,
                departments = [],
                phases = []
            } = payload;

            // Validate cơ bản
            if (!name || !type || !description || !location || !startDate || !endDate) {
                throw new Error('Missing required fields');
            }

            // Validate location format
            if (
                !location.type ||
                location.type !== "Point" ||
                !Array.isArray(location.coordinates) ||
                location.coordinates.length !== 2
            ) {
                throw new Error("Invalid location format: Must be { type: 'Point', coordinates: [lng, lat] }");
            }

            // Optional: validate phases if any
            phases.forEach(phase => {
                if (!phase.name || !phase.start || !phase.end) {
                    throw new Error("Each phase must include name, start, and end date");
                }
            });

            const newCampaign = await Campaign.create({
                name,
                type,
                description,
                location,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                image,
                departments,
                phases
            });

            return newCampaign;
        } catch (err) {
            throw new Error(`Failed to create campaign: ${err.message}`);
        }
    }

    async deleteCampaign(campaignId) {
        try {
            const campaign = await Campaign.findById(campaignId);
            if (!campaign) {
                throw new Error('Campaign not found');
            }

            await Campaign.findByIdAndDelete(campaignId);

            return { message: CAMPAIGN_MESSAGE.DELETE_CAMPAIGN_SUCCESS };
        } catch (err) {
            throw new Error(`Failed to delete campaign: ${err.message}`);
        }
    }

    async getCampaignById(campaignId) {
        try {
            if (!campaignId || !mongoose.Types.ObjectId.isValid(campaignId)) {
                throw new Error('Invalid campaign ID');
            }

            const campaign = await Campaign.findById(campaignId)
                .populate('departments', 'name')
                .populate('volunteerIds', 'fullname');

            if (!campaign) {
                throw new Error('Campaign not found');
            }

            return campaign;
        } catch (err) {
            throw new Error(`Failed to get campaign: ${err.message}`);
        }
    }

    async updateCampaign(campaignId, payload) {
        try {
            if (!mongoose.Types.ObjectId.isValid(campaignId)) {
                throw new Error("Invalid campaign ID");
            }

            const campaign = await Campaign.findById(campaignId);
            if (!campaign) {
                throw new Error("Campaign not found");
            }
            const fields = [
                "name", "description", "type", "startDate", "endDate",
                "location", "departments", "phases", "image"
            ];

            fields.forEach(field => {
                if (payload[field] !== undefined) {
                    campaign[field] = payload[field];
                }
            });

            const updated = await campaign.save();
            return updated;
        } catch (err) {
            throw new Error(`Failed to update campaign: ${err.message}`);
        }
    }

    async registerCampaign({ campaignId, userId }) {
        try {
            if (!mongoose.Types.ObjectId.isValid(campaignId)) {
                throw new Error('Invalid campaign ID');
            }

            const campaign = await Campaign.findById(campaignId);
            if (!campaign) {
                throw new Error('Campaign not found');
            }

            const already = campaign.volunteers.find(v => v.user.toString() === userId);
            if (already) {
                throw new Error('You have already registered');
            }

            campaign.volunteers.push({ user: userId });
            await campaign.save();

            return { message: 'Registration submitted, waiting for admin approval' };
        } catch (err) {
            throw new Error(`Failed to register: ${err.message}`);
        }
    }

    async getCampaignVolunteers(campaignId, statusFilter = null) {
        if (!mongoose.Types.ObjectId.isValid(campaignId)) {
            throw new Error('Invalid campaign ID');
        }

        const campaign = await Campaign.findById(campaignId).populate({
            path: 'volunteers.user',
            select: 'fullName email phone'
        });

        if (!campaign) {
            throw new Error('Campaign not found');
        }

        let volunteers = campaign.volunteers;

        // ?status=pending
        if (statusFilter) {
            volunteers = volunteers.filter(v => v.status === statusFilter);
        }

        return {
            volunteers,
            total: volunteers.length
        };
    }

    async acceptVolunteerInCampaign({ campaignId, userId }) {
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) throw new Error('Không tìm thấy chiến dịch');

        const volunteer = campaign.volunteers.find(v => v.user.toString() === userId);
        if (!volunteer) throw new Error('Người dùng chưa đăng ký chiến dịch này');

        if (volunteer.status === 'approved') {
            throw new Error('Người dùng đã được duyệt trước đó');
        }

        volunteer.status = 'approved';
        await campaign.save();

        const user = await User.findById(userId);
        if (user) {
            const emailContent = {
                body: {
                    name: user.fullName || user.email,
                    intro: `Bạn đã được duyệt tham gia chiến dịch "${campaign.name}" bắt đầu từ ngày ${campaign.startDate.toLocaleDateString()}.`,
                    outro: 'Nếu bạn không đăng ký chiến dịch này, vui lòng bỏ qua email này.'
                }
            };

            const mailBody = MailGenerator.generate(emailContent);

            await transporter.sendMail({
                from: process.env.EMAIL,
                to: user.email,
                subject: 'Xác nhận tham gia chiến dịch - VHHT',
                html: mailBody
            });
        }

        return {
            campaign: campaign.name,
            user: user?.fullName || 'N/A',
            status: 'approved'
        };
    }

    async startCampaign(campaignId) {
        if (!mongoose.Types.ObjectId.isValid(campaignId)) {
            throw new Error('Invalid campaign ID');
        }

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            throw new Error('Campaign not found');
        }

        if (campaign.status !== 'upcoming') {
            throw new Error('Only upcoming campaigns can be started');
        }

        campaign.status = 'in-progress';
        await campaign.save();

        try {
            // 🔹 Gọi AI để tạo nội dung
            const content = await aiServive.generateCampaignContent({
                title: campaign.name,
                description: campaign.description,
                location: campaign.location?.name || 'Việt Nam',
                startDate: campaign.startDate.toLocaleDateString(),
                endDate: campaign.endDate.toLocaleDateString(),
                tone: 'truyền cảm hứng'
            });

            await axios.post('https://hooks.zapier.com/hooks/catch/23147694/2v3x9r1/', {
                title: campaign.name,
                content,
                startDate: campaign.startDate.toLocaleDateString(),
                link: `https://your-site.com/campaigns/${campaign._id}`
            });
        } catch (zapErr) {
            console.error('❌ Zapier or AI failed:', zapErr.message);
        }
        return campaign;
    }
}

const campaignServices = new CampaignServices()
export default campaignServices
