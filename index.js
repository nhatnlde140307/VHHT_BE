import databaseServices from './services/database.services.js'
import { defaultErrorHandler } from './middlewares/errors.middlewares.js'
import pkg from 'lodash'
import bodyParser from 'body-parser'
import express from 'express'
import mongoose from 'mongoose'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import { config } from 'dotenv'
//routes
import usersRouter from './routes/users.routes.js';
import campaignRoutes from './routes/campaign.routes.js';
import checkinRoutes from './routes/checkins.routes.js'
import aiRouter from './routes/ai.routes.js'

config()
const app = express()
const port = 4000
console.log('hello')

databaseServices.connect()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.use(cors({
    origin: "http://localhost:3000",
    credentials: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS"
  }));
  
app.use(express.json())
app.use(cookieParser())

app.get('/', async (req, res) => {
    res.status(200).json("Hello to Rental Car API");
})

app.use('/users', usersRouter)
app.use('/campaigns', campaignRoutes)
app.use('/checkins', checkinRoutes)
app.use('/ai', aiRouter)

app.use(defaultErrorHandler)
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
