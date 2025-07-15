import { USER_MESSAGES } from '../constants/messages.js'
import usersService from '../services/users.services.js'
import User from '../models/users.model.js'
import { CommuneModel } from '../models/commune.model.js'

export const registerController = async (req, res, next) => {
  const result = await usersService.register(req.body)

  return res.json({
    message: USER_MESSAGES.REGISTER_SUCCESS,
    result: result.user,
    id: result.user_id
  })
}

export const getAllcomune = async (req, res) => {
  try {
    const communes = await CommuneModel.find();
    res.status(200).json(communes);
  } catch (error) {
    console.error('Error in getAllcomune:', error);
    res.status(500).json({ message: 'Lỗi khi lấy dữ liệu', error: error.message });
  }
};

export const createManager = async (req, res) => {
  try {
    const { user_id, role } = req.decoded_authorization

    if (role !== 'admin') {
      return res.status(403).json({ message: 'Chỉ admin mới được phép tạo manager' })
    }

    const manager = await usersService.createManager(req.body)
    return res.status(201).json({ message: 'Tạo manager thành công', data: manager })

  } catch (err) {
    console.error(err)
    return res.status(400).json({ message: err.message })
  }
}

export const getUsers = async (req, res, next) => {
  try {
    const filters = req.query
    const users = await usersService.getUsers(filters)
    return res.status(200).json({ data: users })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: err.message })
  }
}

export const getProfile = async (req, res, next) => {
  try {
    const { user_id } = req.decoded_authorization
    const user = await usersService.getUserProfile(user_id)
    return res.status(200).json({ data: user })
  } catch (err) {
    return res.status(400).json({ message: err.message })
  }
}

export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params
    const user = await usersService.getUserById(id)
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' })
    return res.status(200).json({ data: user })
  } catch (err) {
    return res.status(400).json({ message: err.message })
  }
}

export const disableUser = async (req, res, next) => {
   try {
      const { user_id, role } = req.decoded_authorization
      const { id } = req.params

      // Chỉ admin hoặc manager được phép (tuỳ bạn mở rộng)
      if (role !== 'admin') {
        return res.status(403).json({ message: 'Bạn không có quyền thực hiện thao tác này' })
      }

      const result = await usersService.disableUser(id)
      return res.status(200).json({ message: 'Tài khoản đã bị vô hiệu hóa', data: result })
    } catch (err) {
      return res.status(400).json({ message: err.message })
    }
}

export const createOrganization = async (req, res, next) => {
    try {
      const { user_id, role } = req.decoded_authorization
      if (role !== 'manager') {
        return res.status(403).json({ message: 'Chỉ manager được phép tạo tổ chức' })
      }

      const newOrg = await usersService.createOrganization({ managerId: user_id, ...req.body })
      return res.status(201).json({ message: 'Tạo tài khoản tổ chức thành công', data: newOrg })
    } catch (err) {
      return res.status(400).json({ message: err.message })
    }
}

export const enableUser = async (req, res, next) => {
    try {
      const { user_id, role } = req.decoded_authorization
      const { id } = req.params

      if (role !== 'admin') {
        return res.status(403).json({ message: 'Chỉ admin mới được phép kích hoạt tài khoản' })
      }

      const result = await usersService.enableUser(id)
      return res.status(200).json({ message: 'Tài khoản đã được kích hoạt', data: result })
    } catch (err) {
      return res.status(400).json({ message: err.message })
    }
  }

export const googleController = async (req, res, next) => {
  console.log(req.body)
  const result = await usersService.google(req.body)

  return res.json({
    message: USER_MESSAGES.LOGIN_SUCCESS,
    access_token: result?.access_token?.toString(),
    result: result.rest,
    id: result?._id?.toString()
  })
}

export const loginController = async (req, res) => {
  const result = await usersService.login(req.user)

  return res.json({
    message: USER_MESSAGES.LOGIN_SUCCESS,
    access_token: result?.access_token?.toString(),
    result: { ...result.rest, role: result.role },
    id: result._id.toString(),
    role: result.role
  })
}

export const importStaffUsers = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: 'Thiếu file Excel cần import' })
    }
    const role = req.query.role?.toLowerCase()

    const result = await usersService.importUsersFromExcelBuffer(req.file.buffer,role)

    return res.status(201).json({
      message: 'Import user role staff hoàn tất!',
      totalImported: result.successCount,
      failed: result.failed
    })
  } catch (error) {
    console.error('Lỗi import:', error)
    res.status(500).json({ message: 'Có lỗi xảy ra khi import user' })
  }
}

export const updateUserController = async (req, res, next) => {
  const user_id = req.params.userId
  const result = await usersService.updateUser(user_id, req.body, req?.file)
  return res.json({
    message: USER_MESSAGES.UPDATE_PROFILE_SUCCESS,
    result: result.updateUser,
    id: result.user_id
  })
}

export const verifyEmail = async (req, res) => {
  const { token } = req.query

  try {
    const result = await usersService.verifyEmail(token)

    if (result.alreadyVerified) {
      return res.status(200).json({ message: USER_MESSAGES.EMAIL_VERIFY_SUCCESS })
    }

    res.status(200).json({
      message: USER_MESSAGES.EMAIL_VERIFY_SUCCESS,
      access_token: result.access_token
    })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

export const changePasswordController = async (req, res, next) => {
  const { oldPassword, newPassword } = req.body
  const userId = req.decoded_authorization.user_id

  try {
    const result = await usersService.changePassword(userId, oldPassword, newPassword)

    return res.json({
      message: USER_MESSAGES.CHANGE_PASSWORD_SUCCESS,
      result: result.user
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

export const getSkillByUserId = async (req, res, next) => {
  try {
    const { id } = req.params
    const skills = await usersService.getSkillsByUserId(id)
    return res.status(200).json({ data: skills })
  } catch (err) {
    return res.status(400).json({ message: err.message })
  }
}

export const addSkillsToUsers = async (req, res, next) => {
  try {
    const { id } = req.params
    const { skills } = req.body
    const user = await usersService.addSkills(id, skills)
    return res.status(200).json({ message: 'Skills added successfully', data: user })
  } catch (err) {
    return res.status(400).json({ message: err.message })
  }
}

export const updateSkillsOfUsers = async (req, res, next) => {
  try {
    const { id } = req.params
    const { skills } = req.body
    const user = await usersService.updateSkills(id, skills)
    return res.status(200).json({ message: 'Skills updated successfully', data: user })
  } catch (err) {
    return res.status(400).json({ message: err.message })
  }
}