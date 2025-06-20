import { wrapRequestHandler } from '../utils/handlers.js'
import { callbackZalopay,createOrderPaymentZaloPayController } from '../controllers/payments.controller.js'
import express from 'express'
import { accessTokenValidator, optionalAuth } from '../middlewares/users.middlewares.js'


const paymentsRoutes = express.Router()

paymentsRoutes.post('/zalopay_payment_url',optionalAuth, wrapRequestHandler(createOrderPaymentZaloPayController))

paymentsRoutes.post('/zalopay_payment_url/callback', wrapRequestHandler(callbackZalopay))


export default paymentsRoutes
