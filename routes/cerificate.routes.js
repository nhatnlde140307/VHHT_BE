import express from 'express'
import { wrapRequestHandler } from '../utils/handlers.js'
import { getCertificateByCampaign,getCertificateByUser,downloadCertificate,deleteCertificate } from '../controllers/certificate.controller.js'
import { accessTokenValidator, adminValidator } from '../middlewares/users.middlewares.js'

const certificateRoutes = express.Router()

certificateRoutes.get('/campaign/:campaignId',adminValidator, wrapRequestHandler(getCertificateByCampaign))

certificateRoutes.get('/user',accessTokenValidator, wrapRequestHandler(getCertificateByUser))

certificateRoutes.get('/:certificateId/download', wrapRequestHandler(downloadCertificate));

certificateRoutes.delete('/:certificateId', wrapRequestHandler(deleteCertificate))

export default certificateRoutes