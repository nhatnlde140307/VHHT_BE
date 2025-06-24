import express from 'express'
import {
  registerValidator,accessTokenValidator,
  loginValidator,adminValidator, AdminOrganizationAndManagerValidator
} from '../middlewares/users.middlewares.js'
import { wrapRequestHandler } from '../utils/handlers.js'
import { disableUser,createOrganization,enableUser,
  registerController,getUserById,getProfile, getUsers,createManager,verifyEmail,updateUserController,loginController,googleController,changePasswordController
} from '../controllers/users.controller.js'

import uploadCloud from '../utils/cloudinary.config.js'
const usersRoutes = express.Router()

//tao user
usersRoutes.post('/register', registerValidator, wrapRequestHandler(registerController))

//tao manager
usersRoutes.post('/manager',adminValidator, wrapRequestHandler(createManager))

//get User theo role
usersRoutes.get('/',AdminOrganizationAndManagerValidator, wrapRequestHandler(getUsers))

//update user
usersRoutes.put(
  '/update-user/:userId',                 
  uploadCloud.single('avatar'),    
  accessTokenValidator,                    
  wrapRequestHandler(updateUserController) 
)
//get curernt user
usersRoutes.get('/profile',accessTokenValidator, wrapRequestHandler(getProfile))

//cjamhe pw
usersRoutes.put('/change-password', accessTokenValidator, wrapRequestHandler(changePasswordController))

//getuser by id
usersRoutes.get('/:id', AdminOrganizationAndManagerValidator, wrapRequestHandler(getUserById))

//ban user
usersRoutes.patch('/:id/disable', adminValidator, wrapRequestHandler(disableUser))

//tao staff
usersRoutes.post('/create-organization', AdminOrganizationAndManagerValidator, wrapRequestHandler(createOrganization))

//unban
usersRoutes.patch('/:id/enable', adminValidator, wrapRequestHandler(enableUser))

usersRoutes.post('/login', loginValidator, wrapRequestHandler(loginController))

usersRoutes.get('/verify-email', wrapRequestHandler(verifyEmail))


usersRoutes.post('/google', wrapRequestHandler(googleController))



export default usersRoutes
