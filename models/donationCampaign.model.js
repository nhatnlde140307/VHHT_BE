import mongoose from 'mongoose';

const donationCampaignSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },

    campaignId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign',
        default: null
    },

    description: {
        type: String,
        required: true
    },

    goalAmount: {
        type: Number,
        required: true,
        min: 0
    },

    currentAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },

    thumbnail: {
        type: String
    },

    images: [{
        type: String
    }],

    tags: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    }],

    status: {
        type: String,
        enum: ['draft', 'active', 'completed'],
        default: 'draft'
    },
    
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    totalEnd: {type : Number}

}, { timestamps: true });

export default mongoose.model('DonationCampaign', donationCampaignSchema);