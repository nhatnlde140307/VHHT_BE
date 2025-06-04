import { USER_MESSAGES } from '../constants/messages.js'
import newsPostServices from '../services/newsPost.services.js'

export const createNewsPost = async (req, res) => {
  try {
    const images = req.files?.map(file => file.path) || []
    const data = {
      ...req.body,
      images,
    }
    const news = await newsPostServices.createNewPost(data)
    res.status(201).json(news)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}