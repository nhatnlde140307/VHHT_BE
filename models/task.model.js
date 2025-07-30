import mongoose from 'mongoose';

const assignedUserSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { _id: false });

const submissionSchema = new mongoose.Schema({
  content: String,
  images: [String],
  submittedAt: {
    type: Date,
    default: Date.now
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { _id: false });

const peerReviewSchema = new mongoose.Schema({
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reviewee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  score: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  comment: String,
  reviewedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const staffReviewSchema = new mongoose.Schema({
  evaluatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  overallComment: String,
  finalScore: Number,
  reviewedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

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

  leaderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  assignedUsers: [assignedUserSchema],
  submission: submissionSchema,
  peerReviews: [peerReviewSchema],

  staffReview: staffReviewSchema,

  status: {
    type: String,
    enum: ['in_progress', 'submitted', 'completed'],
    default: 'in_progress'
  }

}, {
  timestamps: true
});

export default mongoose.model('Task', taskSchema);
