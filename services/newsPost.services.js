import { config } from 'dotenv'
import NewsPost from '../models/newsPost.model.js'
import { cloudinary } from '../utils/cloudinary.config.js'

config()

class NewsPostService {
    async createNewPost(data, userId) {
        return await new NewsPost({ ...data, createdBy: userId }).save()
    }

    async getAll() {
        return await NewsPost.find().sort({ createdAt: -1 })
    }
    async getById(id) {
        return await NewsPost.findById(id)
    }
    async delete(id) {
        const news = await NewsPost.findById(id)
        if (!news) return null

        for (const url of news.images) {
            const publicId = url.split('/').pop().split('.')[0]
            await cloudinary.uploader.destroy(`VHHT/news/${publicId}`)
        }

        return await NewsPost.findByIdAndDelete(id)
    }
     async update(id, data) {
    return await NewsPost.findByIdAndUpdate(id, data, { new: true })
  }

}

export default new NewsPostService()