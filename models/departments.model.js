import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ""
  },
  leaderIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  memberIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  maxMembers: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

const Department = mongoose.model('Department', departmentSchema);

export default Department;