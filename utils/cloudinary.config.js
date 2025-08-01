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
    //console.log(file)
    const isPdf = file.mimetype === 'application/pdf'

    let folder = 'VHHT/others'

    switch (file.fieldname) {
      case 'certificate':
        folder = 'VHHT/certificates'
        break
      case 'avatar':
        folder = 'VHHT/avatars'
        break
      case 'campaignImg':
      case 'gallery':
        folder = 'VHHT/campaignImg'
        break
      case 'images':
        folder = 'VHHT/news'
        break
      case 'chat':
        folder = 'VHHT/chat'
        break
      case 'bill':
        folder = 'VHHT/bills'
        break
      case 'template':
        folder = 'VHHT/templates'
        break
    }

    //console.log(folder, file.originalname)
    return {
      folder,
      resource_type: isPdf ? 'raw' : 'image',
      format: isPdf ? 'pdf' : undefined,
      public_id: file.originalname.split('.')[0],
    }
  }
})


export const uploadCloud = multer({ storage })
export default uploadCloud
export { cloudinary }