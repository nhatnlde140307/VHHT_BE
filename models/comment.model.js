import mongoose from 'mongoose'

const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null 
  },
  refType: {
    type: String,
    required: true,
    enum: ['NewsPost', 'ForumPost', 'Campaign', 'DonationCampaign']
  },
  refId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  }
}, {
  timestamps: true
})

const Comment = mongoose.model('Comment', commentSchema)
export default Comment