// task.routes.js
import express from "express";
import {
  createTask,
  updateTask,
  deleteTask,
  getTasksByPhaseDayId,
  getTasksByUserAndCampaign,
  submitTask,
  reviewTask,
  assignTaskToUser,
  getTasksByCampaign,
  reviewPeerTask,
  updateTaskStatus,
  getTasksByVolunteer,
} from "../controllers/task.controller.js";
import {
  organizationAndManagerValidator,
  accessTokenValidator,
} from "../middlewares/users.middlewares.js";
import { wrapRequestHandler } from "../utils/handlers.js";
import uploadCloud from "../utils/cloudinary.config.js";

const taskRouter = express.Router();

taskRouter.get(
  "/:campaignId/campaign",
  accessTokenValidator,
  wrapRequestHandler(getTasksByCampaign)
);
taskRouter.get(
  "/phaseDay/:phaseDayId",
  wrapRequestHandler(getTasksByPhaseDayId)
);
taskRouter.post("/create/:phaseDayId", wrapRequestHandler(createTask));
taskRouter.patch("/update/:taskId", wrapRequestHandler(updateTask));
taskRouter.delete("/delete/:taskId", wrapRequestHandler(deleteTask));
taskRouter.post(
  "/:taskId/assign",
  organizationAndManagerValidator,
  wrapRequestHandler(assignTaskToUser)
);
taskRouter.get(
  "/:userId/volunteer",
  accessTokenValidator,
  wrapRequestHandler(getTasksByVolunteer)
);

taskRouter.post(
  "/:taskId/submit",
  accessTokenValidator,
  uploadCloud.array("images", 5),
  wrapRequestHandler(submitTask)
);

taskRouter.post(
  "/:taskId/review/:userId",
  accessTokenValidator,
  uploadCloud.array("images", 5),
  wrapRequestHandler(reviewTask)
);

// ✅ Peer review
taskRouter.post(
  "/:taskId/peer-review/:revieweeId",
  accessTokenValidator,
  wrapRequestHandler(reviewPeerTask)
);

// ✅ Cập nhật status riêng
taskRouter.patch("/:taskId/status", wrapRequestHandler(updateTaskStatus));

export default taskRouter;
