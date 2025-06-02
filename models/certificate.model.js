import mongoose from 'mongoose'

const { Schema } = mongoose

const certificateSchema = new Schema({
  volunteerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  campaignId: {
    type: Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true
  },
  issuedDate: {
    type: Date,
    default: Date.now
  },
  fileUrl: {
    type: String,
    required: true
  },
  verifyCode: {
    type: String,
    required: true,
    unique: true
  }
}, {
  timestamps: true // Tự động tạo createdAt, updatedAt
})

const Certificate = mongoose.model('Certificate', certificateSchema)
export default Certificate