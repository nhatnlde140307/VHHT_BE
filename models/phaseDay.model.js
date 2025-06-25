import mongoose from 'mongoose';

const phaseDaySchema = new mongoose.Schema({
  phaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Phase',
    required: true
  },
  date: { type: Date, required: true },
  checkinLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], 
      required: true
    },
    address: { type: String }
  }
}, { timestamps: true });

export default mongoose.model('PhaseDay', phaseDaySchema);