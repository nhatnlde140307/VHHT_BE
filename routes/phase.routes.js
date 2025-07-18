import express from 'express'
import { createPhase, updatePhase, deletePhase, createPhaseDay, updatePhaseDay, deletePhaseDay, getPhasesByCampaignId, startPhase } from '../controllers/phase.controller.js'
import { organizationAndManagerValidator, accessTokenValidator } from '../middlewares/users.middlewares.js'
import { wrapRequestHandler } from '../utils/handlers.js'
import { createTask, updateTask, deleteTask, getTasksByPhaseDayId,getTasksByUserAndCampaign,submitTask } from '../controllers/task.controller.js';
import uploadCloud from '../utils/cloudinary.config.js';
const phaseRouter = express.Router()

// Lấy tất cả phase và phaseDay theo campaignId
phaseRouter.get(
  '/:campaignId/phases',
  wrapRequestHandler(getPhasesByCampaignId)
)

// Tạo phase
phaseRouter.post(
  '/:campaignId/phases',
  organizationAndManagerValidator,
  wrapRequestHandler(createPhase)
)

// Update phase
phaseRouter.put('/:phaseId', organizationAndManagerValidator, wrapRequestHandler(updatePhase))

// Xóa phase
phaseRouter.delete('/:phaseId', organizationAndManagerValidator, wrapRequestHandler(deletePhase))

//start phase
phaseRouter.put('/:phaseId/start',organizationAndManagerValidator, wrapRequestHandler(startPhase) )

// Tạo phaseday
phaseRouter.post('/:phaseId/days', organizationAndManagerValidator, wrapRequestHandler(createPhaseDay))

// Update phaseday
phaseRouter.patch('/days/:phaseDayId', organizationAndManagerValidator, wrapRequestHandler(updatePhaseDay))

// Delete phaseday
phaseRouter.delete('/days/:phaseDayId', organizationAndManagerValidator, wrapRequestHandler(deletePhaseDay))

// Lấy tất cả task theo phaseDayId
phaseRouter.get('/:phaseDayId/tasks', wrapRequestHandler(getTasksByPhaseDayId))

// Lấy tất cả task theo của user theo campaignId
phaseRouter.get('/:campaignId/task/me', accessTokenValidator, wrapRequestHandler(getTasksByUserAndCampaign))

// Tạo task
phaseRouter.post('/:phaseDayId/tasks', wrapRequestHandler(createTask))

// Update task
phaseRouter.patch('/tasks/:taskId', wrapRequestHandler(updateTask))

// Delete task
phaseRouter.delete('/tasks/:taskId', wrapRequestHandler(deleteTask))

//User nop submitsion 
phaseRouter.post('/tasks/:taskId/submit', accessTokenValidator, uploadCloud.array('images', 5), wrapRequestHandler(submitTask))


export default phaseRouter