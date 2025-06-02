import { v2 as cloudinary } from 'cloudinary'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import multer from 'multer'
import { config } from 'dotenv'

config()

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
})

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isPdf = file.mimetype === 'application/pdf'
    return {
      folder: isPdf ? 'VHHT/templates' : 'VHHT/images',
      resource_type: isPdf ? 'raw' : 'image',
      format: isPdf ? 'pdf' : undefined,
      public_id: file.originalname.split('.')[0],
    }
  }
})

export const uploadCloud = multer({ storage })
export default uploadCloud
export { cloudinary }