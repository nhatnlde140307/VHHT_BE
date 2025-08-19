import express from "express";
import multer from "multer";
import {
  registerValidator,
  accessTokenValidator,
  loginValidator,
  adminValidator,
  AdminOrganizationAndManagerValidator,
} from "../middlewares/users.middlewares.js";
import { wrapRequestHandler } from "../utils/handlers.js";
import {
  importStaffUsers,
  getAllcomune,
  disableUser,
  createOrganization,
  enableUser,
  registerController,
  getUserById,
  getProfile,
  getUsers,
  createManager,
  verifyEmail,
  updateUserController,
  loginController,
  googleController,
  changePasswordController,
  getSkillByUserId,
  addSkillsToUsers,
  updateSkillsOfUsers,
  resetPasswordHandler
} from "../controllers/users.controller.js";

import uploadCloud from "../utils/cloudinary.config.js";
const usersRoutes = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
//get all comune

usersRoutes.get("/commune", getAllcomune);

//tao user
usersRoutes.post(
  "/register",
  registerValidator,
  wrapRequestHandler(registerController)
);

//tao manager
usersRoutes.post("/manager", adminValidator, wrapRequestHandler(createManager));

//get User theo role
usersRoutes.get(
  "/",
  AdminOrganizationAndManagerValidator,
  wrapRequestHandler(getUsers)
);

//update user
usersRoutes.put(
  "/update-user/:userId",
  uploadCloud.single("avatar"),
  accessTokenValidator,
  wrapRequestHandler(updateUserController)
);
//get curernt user
usersRoutes.get(
  "/profile",
  accessTokenValidator,
  wrapRequestHandler(getProfile)
);

//change pw
usersRoutes.put(
  "/change-password",
  accessTokenValidator,
  wrapRequestHandler(changePasswordController)
);

//forgot password
usersRoutes.post("/reset-password", wrapRequestHandler(resetPasswordHandler));

//getuser by id
usersRoutes.get(
  "/:id",
  AdminOrganizationAndManagerValidator,
  wrapRequestHandler(getUserById)
);

//ban user
usersRoutes.patch(
  "/:id/disable",
  adminValidator,
  wrapRequestHandler(disableUser)
);

//tao staff
usersRoutes.post(
  "/create-organization",
  AdminOrganizationAndManagerValidator,
  wrapRequestHandler(createOrganization)
);

//unban
usersRoutes.patch(
  "/:id/enable",
  adminValidator,
  wrapRequestHandler(enableUser)
);

//lolnn
usersRoutes.post("/login", loginValidator, wrapRequestHandler(loginController));

//import multi staff
usersRoutes.post(
  "/import-staffs",
  upload.single("file"),
  AdminOrganizationAndManagerValidator,
  wrapRequestHandler(importStaffUsers)
);

usersRoutes.get("/verify-email", wrapRequestHandler(verifyEmail));

usersRoutes.post("/google", wrapRequestHandler(googleController));

// Get skills by user ID
usersRoutes.get(
  "/:id/skills",
  accessTokenValidator,
  wrapRequestHandler(getSkillByUserId)
);

// Add skills to user
usersRoutes.post(
  "/:id/skills",
  accessTokenValidator,
  wrapRequestHandler(addSkillsToUsers)
);

// Update skills of user
usersRoutes.put(
  "/:id/skills",
  accessTokenValidator,
  wrapRequestHandler(updateSkillsOfUsers)
);

export default usersRoutes;
