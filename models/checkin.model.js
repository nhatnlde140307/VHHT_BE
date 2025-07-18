import mongoose from 'mongoose';

const checkinSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
    },
    phaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Phase',
      required: true,
    },
    phasedayId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PhaseDay',
      required: true,
    },
    method: {
      type: String,
      enum: ['face', 'manual'],
      required: true,
    },
    checkinTime: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Tự động tạo createdAt & updatedAt
  }
);

checkinSchema.index({ userId: 1, phasedayId: 1 }, { unique: true });

export default mongoose.model('Checkin', checkinSchema);
