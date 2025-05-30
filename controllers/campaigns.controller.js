import { USER_MESSAGES, CAMPAIGN_MESSAGE } from '../constants/messages.js'
import { HTTP_STATUS } from '../constants/httpStatus.js'
import campaignServices from '../services/campaigns.services.js'

export const getListCampaigns = async (req, res, next) => {
  try {
    const result = await campaignServices.getListCampaigns(req.query)
    return res.status(HTTP_STATUS.OK).json({
      message: CAMPAIGN_MESSAGE.GET_CAMPAIGN_SUCCESS,
      result
    })
  } catch (error) {
    console.error('Error getting campaigns:', error)
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: 'Can not get list campaign',
      details: error.message
    })
  }
}