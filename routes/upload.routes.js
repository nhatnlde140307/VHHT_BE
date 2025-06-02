import express from 'express'
import uploadCloud from '../utils/cloudinary.config.js'

const uploadRouter = express.Router()

uploadRouter.post('/upload-pdf', uploadCloud.single('template'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Không có file nào được upload' })

  res.status(200).json({
    message: 'Upload thành công',
    url: req.file.path, 
    filename: req.file.originalname,
  })
})

export default uploadRouter