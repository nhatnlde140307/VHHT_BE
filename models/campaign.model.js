import mongoose from 'mongoose';

const { Schema } = mongoose;


const phaseSchema = new Schema({
  name: { type: String, required: true },
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  description: { type: String }
});


const campaignSchema = new Schema({
  name: { type: String, required: true },

  type: {
    type: String,
    enum: ["campaign", "event"],
    required: true
  },

  description: { type: String, required: true },

  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },

  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },

  image: { type: String },

  departments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  }],

  phases: [phaseSchema],


  volunteers: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
      },
      registeredAt: {
        type: Date,
        default: Date.now
      }
    }
  ],

  status: {
    type: String,
    enum: ["upcoming", "in-progress", "completed"],
    default: "upcoming"
  }

}, {
  timestamps: true
});

const Campaign = mongoose.model('Campaign', campaignSchema);
export default Campaign;