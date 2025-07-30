// models/donationExpense.model.js

import mongoose from 'mongoose';

const donationExpenseSchema = new mongoose.Schema({
  donationCampaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DonationCampaign',
    required: true
  },

  amount: {
    type: Number,
    required: true,
    min: 1000
  },

  description: {
    type: String,
    required: true
  },

  evidences: [{
    type: String // URLs hoặc đường dẫn tới ảnh/hóa đơn minh chứng
  }],

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },

  note: {
    type: String
  },

  remainingBalance: {
    type: Number,
    default: null
  }

}, {
  timestamps: true
});

const DonationExpense = mongoose.model('DonationExpense', donationExpenseSchema);

export default DonationExpense;