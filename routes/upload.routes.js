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

uploadRouter.post('/upload-img-multi', uploadCloud.array('images', 5), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'Không có file nào được upload' });
  }

  res.status(200).json({
    message: 'Upload thành công',
    files: req.files.map(file => ({
      url: file.path,
      filename: file.originalname
    }))
  });
});


export default uploadRouter