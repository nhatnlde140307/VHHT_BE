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

export const createCampaign = async (req, res, next) => {
  const result = await campaignServices.createCampaign(req.body)
  return res.status(HTTP_STATUS.CREATED).json({
    message: CAMPAIGN_MESSAGE.CREATE_CAMPAIGN_SUCCESS,
    result
  })
}

export const deleteCampaign = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const result = await campaignServices.deleteCampaign(campaignId);
        return res.status(200).json(result); 
    } catch (err) {
        return res.status(400).json({ error: { message: err.message } });
    }
};

export const getCampaignById = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const campaign = await campaignServices.getCampaignById(campaignId);
    res.json(campaign);
  } catch (err) {
    res.status(404).json({ error: { message: err.message } });
  }
};