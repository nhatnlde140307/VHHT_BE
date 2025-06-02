import express from 'express'
import { wrapRequestHandler } from '../utils/handlers.js'
import { generateContentController } from '../controllers/ai.controller.js'
import axios from 'axios'

const aiRouter = express.Router()

aiRouter.post('/generate-content', wrapRequestHandler(generateContentController))

export default aiRouter