import mongoose from 'mongoose';

const { Schema } = mongoose;

const campaignSchema = new Schema({
  name: { type: String, required: true },

  description: { type: String, required: true },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number],
      required: true
    },
    address: {
      type: String
    }
  },

  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },

  image: { type: String },

  gallery: [{ type: String }],

  departments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  }],

  phases: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Phase'
    }
  ],

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
      },
      evaluation: {
        type: String,
        enum: ['excellent', 'good', 'average', 'poor'],
        default: 'average'
      },
      feedback: {
        type: String
      }
    }
  ],

  certificatesIssued: {
    type: Boolean,
    default: false
  },

  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],

  status: {
    type: String,
    enum: ["upcoming", "in-progress", "completed"],
    default: "upcoming"
  },
  acceptStatus:{
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  }

}, {
  timestamps: true
});

const Campaign = mongoose.model('Campaign', campaignSchema);
export default Campaign;