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
  },
    status: {
        type: String,
        enum: ["upcoming", "in-progress", "completed"],
        default: "upcoming"
    },
    tasks:[
      {
         type: mongoose.Schema.Types.ObjectId,
          ref: 'Task'
      }
    ]
}, { timestamps: true });

export default mongoose.model('PhaseDay', phaseDaySchema);