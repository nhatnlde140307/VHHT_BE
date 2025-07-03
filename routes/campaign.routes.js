import express from 'express'
import { wrapRequestHandler } from '../utils/handlers.js'
import {
  adminValidator,accessTokenValidator,organizationAndManagerValidator,managerValidator,organizationValidator
} from '../middlewares/users.middlewares.js'
import { getListCampaigns,getCampaignVolunteers,
        startCampaignHandler,createCampaign,
        deleteCampaign,getCampaignById,
        acceptRequestHandler, updateCampaign,
        registerCampaign,endCampaign,
        approveCampaign,rejectCampaign
      } from '../controllers/campaigns.controller.js'
import uploadCloud from '../utils/cloudinary.config.js'
import { getDepartmentsByCampaignId, createDepartment,
  updateDepartment,addMemberToDepartment,removeMemberFromDepartment,
  deleteDepartment } from '../controllers/department.controller.js'

const campaignRoutes = express.Router()


//create campaign (staff, manager)
campaignRoutes.post('/',uploadCloud.fields([
  { name: 'campaignImg', maxCount: 1 },
  { name: 'gallery', maxCount: 10 }]), organizationAndManagerValidator,wrapRequestHandler(createCampaign))

// get by id 
campaignRoutes.get('/:campaignId', wrapRequestHandler(getCampaignById))


//getlist
campaignRoutes.get('/',wrapRequestHandler(getListCampaigns))

//delete
campaignRoutes.delete('/:campaignId',managerValidator ,wrapRequestHandler(deleteCampaign))

//update
campaignRoutes.put('/:campaignId', organizationAndManagerValidator,uploadCloud.fields([
  { name: 'campaignImg', maxCount: 1 },
  { name: 'gallery', maxCount: 10 }]), wrapRequestHandler(updateCampaign));

//approve chiến dịch
campaignRoutes.put('/:campaignId/approve', managerValidator, wrapRequestHandler(approveCampaign));

//reject chiến dịch
campaignRoutes.put('/:campaignId/reject', managerValidator, wrapRequestHandler(rejectCampaign));

campaignRoutes.get('/:campaignId/departments', wrapRequestHandler(getDepartmentsByCampaignId));

//tao phong ban
campaignRoutes.post(
  '/:campaignId/departments',
  organizationAndManagerValidator, 
  wrapRequestHandler(createDepartment)
)

// Cập nhật phòng ban
campaignRoutes.put(
  '/departments/:departmentId',
  organizationAndManagerValidator,
  wrapRequestHandler(updateDepartment)
)

// Xoá phòng ban
campaignRoutes.delete(
  '/departments/:departmentId',
  organizationAndManagerValidator,
  wrapRequestHandler(deleteDepartment)
)

// Thêm member vào phòng ban
campaignRoutes.patch(
  '/departments/:departmentId/members/:userId',
  organizationAndManagerValidator,
  wrapRequestHandler(addMemberToDepartment)
)

// Xoá member khỏi phòng ban
campaignRoutes.delete(
  '/departments/:departmentId/members/:userId',
  organizationAndManagerValidator,
  wrapRequestHandler(removeMemberFromDepartment)
)



campaignRoutes.post(
  '/:campaignId/register',
  accessTokenValidator,
  wrapRequestHandler(registerCampaign)
);

campaignRoutes.get(
  '/:id/volunteers',
  accessTokenValidator,
  organizationAndManagerValidator,
  wrapRequestHandler(getCampaignVolunteers)
);

campaignRoutes.post('/:campaignId/accept/:userId', accessTokenValidator, organizationAndManagerValidator, wrapRequestHandler(acceptRequestHandler))

campaignRoutes.put('/:campaignId/start', organizationAndManagerValidator, wrapRequestHandler(startCampaignHandler));

campaignRoutes.put('/:campaignId/end', organizationAndManagerValidator, wrapRequestHandler(endCampaign));

export default campaignRoutes
