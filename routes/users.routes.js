import express from 'express'
import {
  registerValidator,accessTokenValidator, loginValidator
} from '../middlewares/users.middlewares.js'
import { wrapRequestHandler } from '../utils/handlers.js'
import {
  registerController,verifyEmail,updateUserController,loginController
} from '../controllers/users.controller.js'

import uploadCloud from '../utils/cloudinary.config.js'
const usersRoutes = express.Router()

/**
 * Description: Register a user
 * Path: /register
 * Method: POST
 * Body:{ email: string, password: string, confirm_password: string, date_of_birth: ISO8601}
 */
usersRoutes.post('/register', registerValidator, wrapRequestHandler(registerController))

/**
 * Description: Login
 * Path: /login
 * Method: POST
 * Body:{ email: string, password: string}
 */
usersRoutes.post('/login', loginValidator, wrapRequestHandler(loginController))

/**
 * Description: Verify new user
 * Path: /verify-email
 * Method: GET
 */
usersRoutes.get('/verify-email', wrapRequestHandler(verifyEmail))

usersRoutes.put(
  '/update-user/:userId',                 
  uploadCloud.single('avatar'),    
  accessTokenValidator,                    
  wrapRequestHandler(updateUserController) 
)


export default usersRoutes
