import express from 'express'
import { createPhase, updatePhase, deletePhase, createPhaseDay, updatePhaseDay, deletePhaseDay, getPhasesByCampaignId, startPhase } from '../controllers/phase.controller.js'
import { organizationAndManagerValidator, accessTokenValidator } from '../middlewares/users.middlewares.js'
import { wrapRequestHandler } from '../utils/handlers.js'
import { createTask, updateTask, deleteTask, getTasksByPhaseDayId,getTasksByUserAndCampaign,submitTask,reviewTask, assignTaskToUser, getTasksByCampaign } from '../controllers/task.controller.js';
import uploadCloud from '../utils/cloudinary.config.js';
const phaseRouter = express.Router()

//gettask, checkinstatus by Id campaign
phaseRouter.get('/:campaignId/tasks', accessTokenValidator, getTasksByCampaign);

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

// Tạo task
phaseRouter.post('/:phaseDayId/tasks', wrapRequestHandler(createTask))

// Update task
phaseRouter.patch('/tasks/:taskId', wrapRequestHandler(updateTask))

// Delete task
phaseRouter.delete('/tasks/:taskId', wrapRequestHandler(deleteTask))

//giao task cho user
phaseRouter.post('/tasks/:taskId/assign', organizationAndManagerValidator, wrapRequestHandler(assignTaskToUser))

//User nop submitsion 
phaseRouter.post('/tasks/:taskId/submit', accessTokenValidator, uploadCloud.array('images', 5), wrapRequestHandler(submitTask))

//staff review tasksubmitsion
phaseRouter.post('/tasks/:taskId/review/:userId', accessTokenValidator, uploadCloud.array('images', 5), wrapRequestHandler(reviewTask))



export default phaseRouter