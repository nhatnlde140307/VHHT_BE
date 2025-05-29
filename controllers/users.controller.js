import { USER_MESSAGES } from '../constants/messages.js'
import usersService from '../services/users.services.js'

export const registerController = async (req, res, next) => {
  const result = await usersService.register(req.body)

  return res.json({
    message: USER_MESSAGES.REGISTER_SUCCESS,
    access_token: result.access_token.toString(),
    result: result.user,
    id: result.user_id
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
      return res.status(200).json({ message: 'Email already verified' })
    }

    res.status(200).json({
      message: 'Email verified successfully',
      access_token: result.access_token
    })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}