import databaseServices from './services/database.services.js'
import { defaultErrorHandler } from './middlewares/errors.middlewares.js'
import pkg from 'lodash'
import bodyParser from 'body-parser'
import express from 'express'
import mongoose from 'mongoose'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import { config } from 'dotenv'
import http from 'http' 
import { initSocket } from './socket/socket.js'
import Category from './models/category.model.js'
import phaseModel from './models/phase.model.js'

// routes
import usersRouter from './routes/users.routes.js'
import commentRouter from './routes/comment.routes.js'
import campaignRoutes from './routes/campaign.routes.js'
import checkinRoutes from './routes/checkins.routes.js'
import aiRouter from './routes/ai.routes.js'
import uploadRouter from './routes/upload.routes.js'
import newsPostRoutes from './routes/news.routes.js'
import certificateRoutes from './routes/cerificate.routes.js'
import donateRouter from './routes/donationCampaign.routes.js'
import notiRouter from './routes/notification.routes.js'
import paymentsRoutes from './routes/payment.routes.js'
import phaseRouter from './routes/phase.routes.js'
import categoryRoutes from './routes/category.routes.js'
import stormRouter from './routes/storm.routes.js'
import rlPointrouter from './routes/reliefPoint.routes.js'
import issueRouter from './routes/issue.routes.js'
import forumRoutes from './routes/forum.routes.js'
config()

const app = express()
const server = http.createServer(app) // ✅ tạo server để dùng socket
const port = 4000

databaseServices.connect()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS"
}))

app.use(express.json())
app.use(cookieParser())

// 🔌 socket setup
initSocket(server)

app.get('/', async (req, res) => {
  res.status(200).json("Hello to Rental Car API")
})

app.use('/users', usersRouter)
app.use('/payments', paymentsRoutes)
app.use('/campaigns', campaignRoutes)
app.use('/checkin', checkinRoutes)
app.use('/ai', aiRouter)
app.use('/cloud', uploadRouter)
app.use('/news', newsPostRoutes)
app.use('/certificate', certificateRoutes)
app.use('/donate', donateRouter)
app.use('/comment', commentRouter)
app.use('/notification', notiRouter)
app.use('/phase', phaseRouter)
app.use('/category', categoryRoutes)
app.use('/storm', stormRouter)
app.use('/relief-point', rlPointrouter)
app.use('/issue', issueRouter)
app.use('/forum', forumRoutes)

app.use(defaultErrorHandler)

server.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})