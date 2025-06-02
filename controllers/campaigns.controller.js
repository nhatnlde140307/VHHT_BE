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

export const updateCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const result = await campaignServices.updateCampaign(campaignId, req.body);
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
};

export const registerCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const userId = req.decoded_authorization.user_id; 

    const result = await campaignServices.registerCampaign({ campaignId, userId });
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
};

export const getCampaignVolunteers = async (req, res) => {
  try {
    const { id: campaignId } = req.params;
    const { status } = req.query;

    const result = await campaignServices.getCampaignVolunteers(campaignId, status);
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
};

export const acceptRequestHandler = async (req, res) => {
  try {
    const { campaignId, userId } = req.params
    const result = await campaignServices.acceptVolunteerInCampaign({ campaignId, userId })
    res.json({ message: 'Duyệt tham gia thành công', result })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

export const startCampaignHandler = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const updated = await campaignServices.startCampaign(campaignId);
    res.json({ message: 'Chiến dịch được bắt đầu', campaign: updated });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const endCampaign = async (req, res) => {
  try {
    const campaignId = req.params.campaignId
    const result = await campaignServices.endCampaignAndIssueCertificates(campaignId)

    res.status(200).json({
      message: 'Chiến dịch đã kết thúc và chứng chỉ đã được tạo',
      certificates: result
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}