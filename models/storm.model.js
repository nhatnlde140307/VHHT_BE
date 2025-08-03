import mongoose from 'mongoose';

const stormSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  instruction: String,
  centerLocation: {
    lat: Number,
    lng: Number,
  },
  isActive: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['active', 'ended'],
    default: 'active',
  },
  startDate: Date,
  endDate: Date,
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Storm', stormSchema);
