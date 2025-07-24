import mongoose from 'mongoose';

const issueSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved', 'closed'],
    default: 'open'
  },
  type: {
    type: String,
    enum: ['task_issue', 'campaign_withdrawal'],
    required: true
  },
  relatedEntity: {
    type: {
      type: String,
      enum: ['Campaign', 'Task'],
      required: true
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    }
  }
}, {
  timestamps: true
});

// Index để query nhanh
issueSchema.index({ reportedBy: 1, status: 1 });
issueSchema.index({ type: 1, 'relatedEntity.entityId': 1 });

export default mongoose.model('Issue', issueSchema);