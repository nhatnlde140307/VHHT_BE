import express from "express";
import { wrapRequestHandler } from "../utils/handlers.js";
import {
  adminValidator,
  accessTokenValidator,
  organizationAndManagerValidator,
  managerValidator,
  organizationValidator,
} from "../middlewares/users.middlewares.js";
import {
  getListCampaigns,
  getCampaignVolunteers,
  startCampaignHandler,
  createCampaign,
  deleteCampaign,
  getCampaignById,
  acceptRequestHandler,
  updateCampaign,
  getVolunteerCampaign,
  registerCampaign,
  endCampaign,
  approveCampaign,
  rejectCampaign,
  rejectRequestHandler,evaluateVolunteerHandler
} from "../controllers/campaigns.controller.js";
import uploadCloud from "../utils/cloudinary.config.js";
import {
  getDepartmentsByCampaignId,
  createDepartment,
  updateDepartment,
  addMemberToDepartment,
  removeMemberFromDepartment,
  deleteDepartment,
  getDepartmentByVolunteer,
} from "../controllers/department.controller.js";
import { imagesUploader } from "../middlewares/images.middlewares.js";

const campaignRoutes = express.Router();

//get my campaign
campaignRoutes.get(
  "/me",
  accessTokenValidator,
  wrapRequestHandler(getVolunteerCampaign)
);

//create campaign (staff, manager)
campaignRoutes.post(
  "/",
  imagesUploader(["campaignImg", { field: "gallery", max: 5 }]),
  organizationAndManagerValidator,
  wrapRequestHandler(createCampaign)
);

// get by id
campaignRoutes.get("/:campaignId", wrapRequestHandler(getCampaignById));

//getlist
campaignRoutes.get("/", wrapRequestHandler(getListCampaigns));

//delete
campaignRoutes.delete(
  "/:campaignId",
  managerValidator,
  wrapRequestHandler(deleteCampaign)
);

//update
campaignRoutes.put(
  "/:campaignId",
  organizationAndManagerValidator,
  imagesUploader(["campaignImg", { field: "gallery", max: 5 }]),
  wrapRequestHandler(updateCampaign)
);

//approve chiến dịch
campaignRoutes.put(
  "/:campaignId/approve",
  managerValidator,
  wrapRequestHandler(approveCampaign)
);

//reject chiến dịch
campaignRoutes.put(
  "/:campaignId/reject",
  managerValidator,
  wrapRequestHandler(rejectCampaign)
);

// lay department theo campaign
campaignRoutes.get(
  "/:campaignId/departments",
  wrapRequestHandler(getDepartmentsByCampaignId)
);

// lay department theo volunteer
campaignRoutes.get(
  "/:campaignId/departments/volunteer/:volunteerId",
  organizationAndManagerValidator,
  wrapRequestHandler(getDepartmentByVolunteer)
);

//tao phong ban
campaignRoutes.post(
  "/:campaignId/departments",
  organizationAndManagerValidator,
  wrapRequestHandler(createDepartment)
);

// Cập nhật phòng ban
campaignRoutes.put(
  "/departments/:departmentId",
  organizationAndManagerValidator,
  wrapRequestHandler(updateDepartment)
);

// Xoá phòng ban
campaignRoutes.delete(
  "/departments/:departmentId",
  organizationAndManagerValidator,
  wrapRequestHandler(deleteDepartment)
);

// Thêm member vào phòng ban
campaignRoutes.patch(
  "/departments/:departmentId/members/:userId",
  organizationAndManagerValidator,
  wrapRequestHandler(addMemberToDepartment)
);

// Xoá member khỏi phòng ban
campaignRoutes.delete(
  "/departments/:departmentId/members/:userId",
  organizationAndManagerValidator,
  wrapRequestHandler(removeMemberFromDepartment)
);

//volunteer register campaign
campaignRoutes.post(
  "/:campaignId/register",
  accessTokenValidator,
  wrapRequestHandler(registerCampaign)
);

//get volunteer theo campaign
campaignRoutes.get(
  "/:id/volunteers",
  accessTokenValidator,
  organizationAndManagerValidator,
  wrapRequestHandler(getCampaignVolunteers)
);

//accept vonlunteer
campaignRoutes.post(
  "/:campaignId/accept/:userId",
  accessTokenValidator,
  organizationAndManagerValidator,
  wrapRequestHandler(acceptRequestHandler)
);

//reject vonlunteer
campaignRoutes.post(
  "/:campaignId/reject/:userId",
  accessTokenValidator,
  organizationAndManagerValidator,
  wrapRequestHandler(rejectRequestHandler)
);

//start campaign, post fb
campaignRoutes.put(
  "/:campaignId/start",
  organizationAndManagerValidator,
  wrapRequestHandler(startCampaignHandler)
);

//end campaign, render certification
campaignRoutes.put(
  "/:campaignId/end",
  organizationAndManagerValidator,
  wrapRequestHandler(endCampaign)
);

//danh gia vol
campaignRoutes.post(
  "/:campaignId/evaluate/:userId",
  accessTokenValidator,
  organizationAndManagerValidator,
  wrapRequestHandler(evaluateVolunteerHandler)
);

export default campaignRoutes;
