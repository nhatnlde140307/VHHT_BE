import { config } from 'dotenv'
import { signToken } from '../utils/jwt.js'
import { ObjectId } from 'mongodb'
import jwt from 'jsonwebtoken'
import User from '../models/users.model.js'
import { comparePassword, hashPassword } from '../utils/crypto.js'
import { TokenType } from '../constants/enums.js'
import { MailGenerator, transporter } from '../utils/nodemailerConfig.js'
import mongoose from 'mongoose'
config()
class UsersService {
  signAccessToken(user_id, role) {
    console.log(user_id, role)
    return signToken({
      payload: { user_id: user_id, role, token_type: TokenType.AccessToken },
      privateKey: process.env.JWT_SECRET_ACCESS_TOKEN
    })
  }

  async register(payload) {
    const user_id = new ObjectId()
    const newUser = new User({
      ...payload,
      _id: user_id,
      password: hashPassword(payload.password).toString(),
    })

    try {
      const user = await newUser.save()

      const verifyToken = jwt.sign(
        { userId: user_id.toString() },
        process.env.EMAIL_SECRET,
        { expiresIn: '1h' }
      )

      const verifyLink = `http://localhost:4000/users/verify-email?token=${verifyToken}`

      const emailContent = {
        body: {
          name: payload.name || payload.email,
          intro: 'Welcome to VHHT! Please verify your email.',
          action: {
            instructions: 'Click below to verify your email:',
            button: {
              color: '#22BC66',
              text: 'Verify Email',
              link: verifyLink
            }
          },
          outro: 'If you did not register, ignore this email.'
        }
      }

      const mailBody = MailGenerator.generate(emailContent)

      await transporter.sendMail({
        from: process.env.EMAIL,
        to: payload.email,
        subject: 'Verify your VHHT account',
        html: mailBody
      })

      return { message: 'User registered. Please check email to verify.' }

    } catch (error) {
      throw new Error(error)
    }
  }

  async checkExistEmail(email) {
    const user = await User.findOne({ email })
    return Boolean(user)
  }

  async checkActivityUser(email) {
    const user = await User.findOne({ email })
    if (user?.status === 'inactive') {
      return Boolean(true)
    }
    return Boolean(false)
  }

  async login(payload) {
    const user = { ...payload }

    const { password: hashedPassword, role, _id, ...rest } = user._doc

    const access_token = await this.signAccessToken(_id.toString(), role)
    return { rest, access_token, role, _id }
  }

  async google(payload) {
    try {
      const user = { ...payload }
      const user1 = await User.findOne({ email: user.email })
      if (user1) {
        const access_token = await this.signAccessToken(user1._id.toString(), user1.role)

        const { password: hashedPassword, ...rest } = user1._doc
        console.log(access_token)
        return { rest, access_token, _id: user._id }
      } else {
        const generatedPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
        const hashedPassword1 = hashPassword(generatedPassword).toString()
        const newUser = new User({
          fullname: user.fullname,
          email: user.email,
          password: hashedPassword1,
          profilePicture: user.photo,
          phoneNumber: ''
        })
        await newUser.save()
        const user2 = await User.findOne({ email: user.email })
        const { _id: id } = user2._doc
        const access_token = await this.signAccessToken(id.toString(), 'user')
        console.log(access_token)
        const { password: hashedPassword2, _id, ...rest } = newUser._doc
        return { rest, access_token, _id }
      }
    } catch (error) {
      console.log(error)
    }
  }

  async getUser(payload) {
    const { user_id } = { ...payload }

    try {
      const getUser = await User.findOne({ _id: user_id.toString() }).populate('driverLicenses')
      return { getUser, user_id }
    } catch (error) { }
  }

  async getUserByEmail(payload) {
    const { email } = { ...payload }
    console.log(email)

    try {
      const getUser = await User.findOne({ email: email.toString() })
      return getUser
    } catch (error) { }
  }

  async updateUser(user_id, payload, payloadFile) {
    try {
      if (payloadFile && payloadFile.path) {
        payload.profilePicture = payloadFile.path
      }
      const updateUser = await User.findByIdAndUpdate(user_id.toString(), { ...payload }, { new: true })

      return { updateUser, user_id }
    } catch (error) {
      throw Error(error)
    }
  }

  async resetPassword(payload) {
    try {
      const user = await User.findOne({ email: payload.email })

      const resetPassword = await User.findByIdAndUpdate(
        user._id.toString(),
        { $set: { password: hashPassword(payload.password).toString() } },
        { new: true }
      )
      return resetPassword
    } catch (error) {
      console.log(error)
    }
  }

  async changePassword(user_id, oldPassword, newPassword) {
    try {

      const user = await User.findById(user_id)
      const isPasswordValid = await comparePassword(oldPassword, user.password)
      if (!isPasswordValid) {
        throw new Error('Invalid old password')
      }

      user.password = hashPassword(newPassword).toString()
      await user.save()

      const updatedUser = await User.findById(user_id)

      return { message: 'Password changed successfully', user: updatedUser }
    } catch (error) {
      console.log(error)
    }
  }

  async updateUser(user_id, payload, payloadFile) {
    try {
      if (payloadFile && payloadFile.path) {
        payload.avatar = payloadFile.path
      }
      const updateUser = await User.findByIdAndUpdate(user_id.toString(), { ...payload }, { new: true })

      return { updateUser, user_id }
    } catch (error) {
      throw Error(error)
    }
  }

  async verifyEmail(token) {
    try {
      const decoded = jwt.verify(token, process.env.EMAIL_SECRET)
      const user = await User.findById(decoded.userId)

      if (!user) throw new Error('User not found')
      if (user.status === 'active') return { alreadyVerified: true }

      user.status = 'active'
      await user.save()

      const access_token = await this.signAccessToken(user._id.toString(), user.role)

      return { access_token }
      console.log(access_token)
    } catch (error) {
      throw new Error(error.message || 'Invalid or expired token')
    }
  }

  async changePassword(user_id, oldPassword, newPassword) {
    try {
      const user = await User.findById(user_id)

      const isPasswordValid = await comparePassword(oldPassword, user.password)
      if (!isPasswordValid) {
        throw new Error('Invalid old password')
      }

      user.password = hashPassword(newPassword).toString()
      await user.save()

      const updatedUser = await User.findById(user_id)

      return { message: 'Password changed successfully', user: updatedUser }
    } catch (error) {
      console.log(error)
    }
  }

}



export default new UsersService()
