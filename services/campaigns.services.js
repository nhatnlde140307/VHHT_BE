import Campaign from '../models/campaign.model.js';
import mongoose from 'mongoose'
import { hashPassword } from '../utils/crypto.js'

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
}

const campaignServices = new CampaignServices()
export default campaignServices
