// models/issue.model.js
import mongoose from 'mongoose';

const issueSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  images: {
    type: [String],  
    default: []
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'resolved', 'closed'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'  
  },
  
  staffComment: {
    type: String,
    default: ''
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'  // Staff ID
  },
  resolvedAt: {
    type: Date
  }
}, {
  timestamps: true  // Tự động createdAt, updatedAt
});

// Index cho query nhanh
issueSchema.index({ taskId: 1, userId: 1 });
issueSchema.index({ status: 1 });

export default mongoose.model('Issue', issueSchema);