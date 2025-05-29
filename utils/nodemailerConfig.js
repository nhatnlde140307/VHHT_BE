import nodemailer from 'nodemailer'
import Mailgen from 'mailgen'
import { config } from 'dotenv'
config()

const nodeConfig = {
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465, 
  secure: true, 
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD 
  }
}

export const transporter = nodemailer.createTransport(nodeConfig)

export const MailGenerator = new Mailgen({
  theme: 'default',
  product: {
    name: 'VHHT',
    link: 'http://localhost:3000'
  }
})