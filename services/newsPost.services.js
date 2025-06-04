import { config } from 'dotenv'
import NewsPost from '../models/newsPost.model.js'

config()

class NewsPostService {
  async createNewPost(data) {
    return await new NewsPost(data).save()
  }
}

export default new NewsPostService()