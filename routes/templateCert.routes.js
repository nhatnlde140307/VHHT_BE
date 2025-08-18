import { Router } from 'express'
import {
  createTemplateCtrl,
  getTemplatesCtrl,
  getTemplateByIdCtrl,
  updateTemplateCtrl,
  deleteTemplateCtrl
} from '../controllers/templateCert.controller.js'
import uploadCloud from '../utils/cloudinary.config.js'

const tempCertrouter = Router()

tempCertrouter.get('/', getTemplatesCtrl)
tempCertrouter.get('/:id', getTemplateByIdCtrl)
tempCertrouter.post('/',uploadCloud.single('template'), createTemplateCtrl)
tempCertrouter.put('/:id', updateTemplateCtrl)
tempCertrouter.delete('/:id', deleteTemplateCtrl)

export default tempCertrouter
