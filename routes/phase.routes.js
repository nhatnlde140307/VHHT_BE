import express from 'express'
import { createPhase, updatePhase, deletePhase, createPhaseDay, updatePhaseDay, deletePhaseDay, getPhasesByCampaignId } from '../controllers/phase.controller.js'
import { organizationAndManagerValidator } from '../middlewares/users.middlewares.js'
import { wrapRequestHandler } from '../utils/handlers.js'
import { createTask, updateTask, deleteTask } from '../controllers/task.controller.js';
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

// Tạo phaseday
phaseRouter.post('/:phaseId/days', organizationAndManagerValidator, wrapRequestHandler(createPhaseDay))

// Update phaseday
phaseRouter.patch('/days/:phaseDayId', organizationAndManagerValidator, wrapRequestHandler(updatePhaseDay))

// Delete phaseday
phaseRouter.delete('/days/:phaseDayId', organizationAndManagerValidator, wrapRequestHandler(deletePhaseDay))

// Tạo task
phaseRouter.post('/:phaseDayId/tasks', wrapRequestHandler(createTask))

// Update task
phaseRouter.patch('/tasks/:taskId', wrapRequestHandler(updateTask))

// Delete task
phaseRouter.delete('/tasks/:taskId', wrapRequestHandler(deleteTask))

export default phaseRouter