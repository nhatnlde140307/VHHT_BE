import express from 'express'
import {
  registerValidator,accessTokenValidator, loginValidator
} from '../middlewares/users.middlewares.js'
import { wrapRequestHandler } from '../utils/handlers.js'
import {
  registerController,verifyEmail,updateUserController,approvedOrganization,loginController,googleController,changePasswordController,registerOrganizationController
} from '../controllers/users.controller.js'

import uploadCloud from '../utils/cloudinary.config.js'
const usersRoutes = express.Router()


usersRoutes.post('/register', registerValidator, wrapRequestHandler(registerController))

usersRoutes.post('/register-organization', registerValidator, wrapRequestHandler(registerOrganizationController))

usersRoutes.put('/approved-organization/:userId', wrapRequestHandler(approvedOrganization))

usersRoutes.post('/login', loginValidator, wrapRequestHandler(loginController))

usersRoutes.get('/verify-email', wrapRequestHandler(verifyEmail))

usersRoutes.put(
  '/update-user/:userId',                 
  uploadCloud.single('avatar'),    
  accessTokenValidator,                    
  wrapRequestHandler(updateUserController) 
)

usersRoutes.post('/google', wrapRequestHandler(googleController))

usersRoutes.put('/change-password', accessTokenValidator, wrapRequestHandler(changePasswordController))


export default usersRoutes
