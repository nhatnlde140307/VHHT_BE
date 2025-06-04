import mongoose from 'mongoose'

const newsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  content: {
    type: String,
    required: true, 
  },
  images: [String],
}, {
  timestamps: true 
})
const NewsPost = mongoose.model('NewsPost', newsSchema)

export default NewsPost