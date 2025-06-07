import mongoose from 'mongoose';

const donationTransactionSchema = new mongoose.Schema({
  // ✅ Ủng hộ cho DonationCampaign (nếu là chiến dịch gây quỹ chuyên biệt)
  donationCampaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DonationCampaign',
    default: null
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  donorName: {
    type: String,
    required: true
  },

  anonymous: {
    type: Boolean,
    default: false
  },

  amount: {
    type: Number,
    required: true,
    min: 1000 
  },

  message: {
    type: String
  },

  paymentMethod: {
    type: String,
    enum: ['Momo', 'VNPay', 'Cash'],
    required: true
  },

  paymentStatus: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending'
  },

  transactionCode: {
    type: String
  }

}, { timestamps: true });


// ✅ Middleware: đảm bảo có ít nhất 1 loại campaign
donationTransactionSchema.pre('save', function (next) {
  if (!this.donationCampaignId && !this.campaignId) {
    return next(new Error('Transaction must reference either donationCampaignId or campaignId.'));
  }
  next();
});

export default mongoose.model('DonationTransaction', donationTransactionSchema);