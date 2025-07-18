import mongoose from 'mongoose';

const assignedUserSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Task Submission
  submission: {
    content: String, 
    images: [String], 
    submittedAt: Date,
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User' 
    }
  },
  // Task Review
  review: {
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    evaluation: {
      type: String,
      enum: ['excellent', 'good', 'average', 'poor']
    },
    staffComment: String,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date
  }
});

const taskSchema = new mongoose.Schema({
  phaseDayId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PhaseDay',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  assignedUsers: [assignedUserSchema]
}, {
  timestamps: true
});

export default mongoose.model('Task', taskSchema);
