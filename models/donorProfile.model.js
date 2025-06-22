import mongoose from 'mongoose';

const donatedCampaignSchema = new mongoose.Schema({
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DonationCampaign',
    required: true
  },
  totalAmount: {
    type: Number,
    default: 0
  }
}, { _id: false });

const donorProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },

  totalDonated: {
    type: Number,
    default: 0
  },

  donatedCampaigns: [donatedCampaignSchema],

  anonymousDefault: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });

export default mongoose.model('DonorProfile', donorProfileSchema);