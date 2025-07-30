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
    type: String
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

}, { timestamps: true });