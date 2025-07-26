// task.route.js
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
} from "../controllers/task.controller.js";
import {
  organizationAndManagerValidator,
  accessTokenValidator,
} from "../middlewares/users.middlewares.js";
import { wrapRequestHandler } from "../utils/handlers.js";
import uploadCloud from "../utils/cloudinary.config.js";

const taskRouter = express.Router();

// Get tasks by campaign ID
taskRouter.get(
  "/:campaignId/campaign",
  accessTokenValidator,
  wrapRequestHandler(getTasksByCampaign)
);

// Get tasks by phase day ID
taskRouter.get(
  "/phaseDay/:phaseDayId",
  wrapRequestHandler(getTasksByPhaseDayId)
);

// Create task
taskRouter.post("/create/:phaseDayId", wrapRequestHandler(createTask));

// Update task
taskRouter.patch("/update/:taskId", wrapRequestHandler(updateTask));

// Delete task
taskRouter.delete("/delete/:taskId", wrapRequestHandler(deleteTask));

// Assign task to user
taskRouter.post(
  "/:taskId/assign",
  organizationAndManagerValidator,
  wrapRequestHandler(assignTaskToUser)
);

// User submit task
taskRouter.post(
  "/:taskId/submit",
  accessTokenValidator,
  uploadCloud.array("images", 5),
  wrapRequestHandler(submitTask)
);

// Staff review task submission
taskRouter.post(
  "/:taskId/review/:userId",
  accessTokenValidator,
  uploadCloud.array("images", 5),
  wrapRequestHandler(reviewTask)
);

export default taskRouter;
