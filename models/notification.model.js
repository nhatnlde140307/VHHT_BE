import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },

  content: {
    type: String,
    required: true,
  },

  link: {
    type: String, 
  },

  type: {
    type: String,
    enum: ['comment_reply', 'campaign_approved', 'donation', 'system', 'certificate'],
    required: true,
  },

  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', 
    required: true
  },

  isRead: {
    type: Boolean,
    default: false
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
})

const Notification = mongoose.model('Notification', notificationSchema)
export default Notification