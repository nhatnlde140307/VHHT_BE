import Campaign from '../models/campaign.model.js';
import mongoose from 'mongoose'
import { hashPassword } from '../utils/crypto.js'
import Department from '../models/departments.model.js';
import { CAMPAIGN_MESSAGE } from '../constants/messages.js';

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
}

const campaignServices = new CampaignServices()
export default campaignServices
