import { config } from 'dotenv'
import { signToken } from '../utils/jwt.js'
import { ObjectId } from 'mongodb'
import jwt from 'jsonwebtoken'
import User from '../models/users.model.js'
import { comparePassword, hashPassword } from '../utils/crypto.js'
import { TokenType } from '../constants/enums.js'
import { MailGenerator, transporter } from '../utils/nodemailerConfig.js'
import DonorProfile from '../models/donorProfile.model.js'
import { CommuneModel } from '../models/commune.model.js'
import mongoose from 'mongoose'
import xlsx from 'xlsx'
import bcrypt from 'bcrypt'

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

    // Convert communeId (nếu có) sang ObjectId
    const communeObjectId = payload.communeId ? new ObjectId(payload.communeId) : null

    const newUser = new User({
      ...payload,
      _id: user_id,
      password: hashPassword(payload.password).toString(),
      communeId: communeObjectId, // thêm dòng này
    })

    try {
      const user = await newUser.save()

      const verifyToken = jwt.sign(
        { userId: user_id.toString() },
        process.env.EMAIL_SECRET,
        { expiresIn: '1h' }
      )

      const verifyLink = `${process.env.BACKEND_URL}/users/verify-email?token=${verifyToken}`

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

  async createManager({ fullName, email, password, phone, date_of_birth, communeId }) {
    const objectId = new mongoose.Types.ObjectId(communeId)
    const commune = await CommuneModel.findById(objectId)
    console.log(commune)
    if (!commune) {
      throw new Error('Xã không tồn tại trong hệ thống')
    }

    const existing = await User.findOne({ email })
    if (existing) {
      throw new Error('Email đã được sử dụng')
    }

    const hashed = await hashPassword(password)

    const manager = new User({
      fullName,
      email,
      phone,
      password: hashed,
      date_of_birth,
      role: 'manager',
      status: 'active',
      communeId: objectId
    })

    await manager.save()
    return manager
  }

  async getUsers({ role, district, province }) {
    const userFilter = {}
    if (role) userFilter.role = role
    userFilter.role = { $ne: 'admin' } 

    if (district || province) {
      const communeFilter = {}
      if (district) communeFilter.district = district
      if (province) communeFilter.province = province

      const communes = await CommuneModel.find(communeFilter).select('_id')
      const communeIds = communes.map(c => c._id)
      userFilter.communeId = { $in: communeIds }
    }

    const users = await User.find(userFilter)
      .populate('communeId')
      .select('-password')

    return users
}

  async getUserById(userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('ID không hợp lệ')
    }

    const user = await User.findById(userId)
      .populate('communeId')
      .select('-password')

    return user
  }

  async getUserProfile(userId) {
    const user = await User.findById(userId)
      .populate('communeId')  // trả kèm địa lý nếu có
      .select('-password')     // không trả về password

    if (!user) {
      throw new Error('Người dùng không tồn tại')
    }

    return user
  }

  async disableUser(userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('ID không hợp lệ')
    }

    const user = await User.findById(userId)
    if (!user) {
      throw new Error('Người dùng không tồn tại')
    }

    if (user.status === 'inactive') {
      throw new Error('Tài khoản đã bị vô hiệu hóa trước đó')
    }

    user.status = 'inactive'
    await user.save()
    return user
  }

  async createOrganization({ managerId, fullName, email, phone, password, date_of_birth }) {
    if (!mongoose.Types.ObjectId.isValid(managerId)) {
      throw new Error('ID manager không hợp lệ')
    }

    const manager = await User.findById(managerId)
    if (!manager || manager.role !== 'manager') {
      throw new Error('Manager không tồn tại hoặc không hợp lệ')
    }

    const existing = await User.findOne({ email })
    if (existing) {
      throw new Error('Email đã được sử dụng')
    }

    const hashedPassword = await hashPassword(password)

    const newOrg = new User({
      fullName,
      email,
      phone,
      password: hashedPassword,
      date_of_birth,
      role: 'organization',
      status: 'active',
      communeId: manager.communeId,
      managedBy: manager._id
    })

    await newOrg.save()
    return newOrg.toObject({ getters: true, virtuals: false })
  }

  async enableUser(userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('ID không hợp lệ')
    }

    const user = await User.findById(userId)
    if (!user) {
      throw new Error('Người dùng không tồn tại')
    }

    if (user.status === 'active') {
      throw new Error('Tài khoản đã đang ở trạng thái active')
    }

    user.status = 'active'
    await user.save()
    return user
  }

  async importUsersFromExcelBuffer(buffer, role = 'user') {

    const workbook = xlsx.read(buffer, { type: 'buffer' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const data = xlsx.utils.sheet_to_json(sheet)

    const saltRounds = 10

    const success = []
    const failed = []

    for (const item of data) {
      const existingUser = await User.findOne({ email: item.email })

      if (existingUser) {
        failed.push({
          email: item.email,
          reason: 'Email đã tồn tại trong hệ thống'
        })
        continue
      }

      const hashedPassword = await bcrypt.hash(item.password, saltRounds)

      const newUser = new User({
        fullName: item.fullName,
        email: item.email,
        phone: item.phone,
        password: hashedPassword,
        date_of_birth: new Date(item.date_of_birth),
        bio: item.bio || '',
        communeId: item.communeId || null,
        role: role,
        status: 'active',
        avatar: ''
      })

      await newUser.save()
      success.push(item.email)
    }

    return {
      successCount: success.length,
      failed
    }}


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

  async createDonorProfile(user) {
      try {
        if (!user) {
          console.error("❌ User is undefined in createDonorProfile");
          throw new Error("User not found");
        }

        const exists = await DonorProfile.findOne({ userId: user._id });
        if (exists) {
          console.warn("⚠️ Donor profile already exists for user:", user._id);
          throw new Error("Donor profile already exists");
        }

        const donorProfile = await DonorProfile.create({
          userId: user._id,
          donatedCampaigns: [],
          totalDonated: 0
        });

        console.log("✅ Donor profile created:", donorProfile._id);
        return donorProfile;
      } catch (error) {
        console.error("❌ Error in createDonorProfile:", error);
        throw new Error(error.message || "Error creating donor profile");
      }
    }

  }



export default new UsersService()
