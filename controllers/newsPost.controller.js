import { USER_MESSAGES } from '../constants/messages.js'
import newsPostServices from '../services/newsPost.services.js'
import { cloudinary } from '../utils/cloudinary.config.js'

export const createNewsPost = async (req, res) => {
  try {
    const images = req.files?.map(file => file.path) || []
    const userId = req.decoded_authorization.user_id;
    const data = {
      ...req.body,
      images,
    }
    const news = await newsPostServices.createNewPost(data, userId)
    res.status(201).json(news)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const listNewsPost = async (req, res) => {
  try {
    const newsList = await newsPostServices.getAll()
    res.json(newsList) 
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const getNewsById = async (req, res) => {
  try {
    const { newsId } = req.params
    const news = await newsPostServices.getById(newsId)

    if (!news) {
      return res.status(404).json({ error: 'News not found' })
    }

    res.json(news)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const deleteNews = async (req, res) => {
  try {
    const { id } = req.params
    const deleted = await newsPostServices.delete(id)

    if (!deleted) {
      return res.status(404).json({ error: 'News not found' })
    }

    res.json({ message: 'Deleted successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const updateNews = async (req, res) => {
  try {
    const { id } = req.params
    const updateData = { ...req.body }

    // Nếu có ảnh mới → xoá ảnh cũ trước
    if (req.files && req.files.length > 0) {
      const existing = await newsPostServices.getById(id)
      if (!existing) return res.status(404).json({ error: 'News not found' })

      // Xoá từng ảnh trên Cloudinary
      for (const url of existing.images) {
        const publicId = url.split('/').pop().split('.')[0]
        await cloudinary.uploader.destroy(`VHHT/news/${publicId}`)
      }

      // Gán ảnh mới vào updateData
      updateData.images = req.files.map(f => f.path)
    }

    const updated = await newsPostServices.update(id, updateData)
    if (!updated) return res.status(404).json({ error: 'News not found' })

    res.json(updated)
  } catch (err) {
    console.error('UPDATE NEWS ERROR:', err)
    res.status(500).json({ error: err.message })
  }
}