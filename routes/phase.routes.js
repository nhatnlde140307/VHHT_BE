import express from 'express'
import { createPhase, updatePhase, deletePhase,createPhaseDay,updatePhaseDay,deletePhaseDay } from '../controllers/phase.controller.js'
import { organizationAndManagerValidator } from '../middlewares/users.middlewares.js'
import { wrapRequestHandler } from '../utils/handlers.js'
import { createTask, updateTask, deleteTask } from '../controllers/task.controller.js';
const phaseRouter = express.Router()

//tao phase
phaseRouter.post(
  '/campaigns/:campaignId/phases',
  organizationAndManagerValidator,
  wrapRequestHandler(createPhase)
)

//update phase
phaseRouter.put('/:phaseId', organizationAndManagerValidator, wrapRequestHandler(updatePhase))

//xoa phase
phaseRouter.delete('/:phaseId', organizationAndManagerValidator, wrapRequestHandler(deletePhase))

//tao phaseday
phaseRouter.post('/:phaseId/days',organizationAndManagerValidator, wrapRequestHandler(createPhaseDay))

//update phaseday
phaseRouter.patch('/days/:phaseDayId',organizationAndManagerValidator, wrapRequestHandler(updatePhaseDay))

//delete phaseday
phaseRouter.patch('/days/:phaseDayId',organizationAndManagerValidator, wrapRequestHandler(deletePhaseDay))

//tao task
phaseRouter.post('/:phaseDayId/tasks', wrapRequestHandler(createTask));

//update task
phaseRouter.patch('/tasks/:taskId', wrapRequestHandler(updateTask));

//delete task
phaseRouter.delete('/tasks/:taskId', wrapRequestHandler(deleteTask));


export default phaseRouter
