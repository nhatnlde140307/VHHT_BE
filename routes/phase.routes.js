import express from "express";
import {
  createPhase,
  updatePhase,
  deletePhase,
  createPhaseDay,
  updatePhaseDay,
  deletePhaseDay,
  getPhasesByCampaignId,
  startPhase,endPhase
} from "../controllers/phase.controller.js";
import {
  organizationAndManagerValidator,
  accessTokenValidator,
} from "../middlewares/users.middlewares.js";
import { wrapRequestHandler } from "../utils/handlers.js";
import uploadCloud from "../utils/cloudinary.config.js";
const phaseRouter = express.Router();

// Lấy tất cả phase và phaseDay theo campaignId
phaseRouter.get(
  "/:campaignId/phases",
  wrapRequestHandler(getPhasesByCampaignId)
);

// Tạo phase
phaseRouter.post(
  "/:campaignId/phases",
  organizationAndManagerValidator,
  wrapRequestHandler(createPhase)
);

// Update phase
phaseRouter.put(
  "/:phaseId",
  organizationAndManagerValidator,
  wrapRequestHandler(updatePhase)
);

// Xóa phase
phaseRouter.delete(
  "/:phaseId",
  organizationAndManagerValidator,
  wrapRequestHandler(deletePhase)
);

//start phase
phaseRouter.put(
  "/:phaseId/start",
  organizationAndManagerValidator,
  wrapRequestHandler(startPhase)
);

//end phase
phaseRouter.put(
  "/:phaseId/end",
  organizationAndManagerValidator,
  wrapRequestHandler(endPhase)
);


// Tạo phaseday
phaseRouter.post(
  "/:phaseId/days",
  organizationAndManagerValidator,
  wrapRequestHandler(createPhaseDay)
);

// Update phaseday
phaseRouter.patch(
  "/days/:phaseDayId",
  organizationAndManagerValidator,
  wrapRequestHandler(updatePhaseDay)
);

// Delete phaseday
phaseRouter.delete(
  "/days/:phaseDayId",
  organizationAndManagerValidator,
  wrapRequestHandler(deletePhaseDay)
);


export default phaseRouter;

