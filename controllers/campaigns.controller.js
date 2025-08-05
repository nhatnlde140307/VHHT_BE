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

export const evaluateVolunteerHandler = async (req, res) => {
  try {
    const { campaignId, userId } = req.params;
    const { evaluation, feedback } = req.body;

    const result = await campaignServices.evaluateVolunteerInCampaign({
      campaignId,
      userId,
      evaluation,
      feedback
    });

    return res.status(200).json({
      success: true,
      message: 'Đánh giá thành công',
      data: result
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const getVolunteerCampaign = async (req, res, next) => {
  try {
    const userId = req.decoded_authorization.user_id;
    const result = await campaignServices.getVolunteerListCampaigns(userId)
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
  try {
    const userId = req.decoded_authorization.user_id;
    const campaignImg = req.body?.campaignImg || null;
    const gallery = req.body?.gallery || [];
    const campaign = await campaignServices.createCampaign(req.body, userId, campaignImg, gallery);

    return res.status(201).json({
      success: true,
      message: 'Tạo chiến dịch thành công',
      data: campaign
    });
  } catch (error) {
    console.error('Lỗi khi tạo chiến dịch:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Lỗi server khi tạo chiến dịch'
    });
  }
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
    const campaignId = req.params.campaignId;
    const campaign = await campaignServices.getCampaignById(campaignId);
    return res.status(200).json({
      success: true,
      message: 'Lấy thông tin chiến dịch thành công',
      data: campaign
    });
  } catch (error) {
    console.error('Lỗi khi lấy chiến dịch:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Lỗi server khi lấy chiến dịch'
    });
  }
};

export const updateCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const campaignImg = req.body?.campaignImg || null;
    const gallery = req.body?.gallery || [];
    const result = await campaignServices.updateCampaign(campaignId, req.body, campaignImg, gallery);
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
};

export const approveCampaign = async (req, res) => {
  const { campaignId } = req.params

  const updatedCampaign = await campaignServices.approveCampaign(campaignId)

  return res.status(200).json({
    success: true,
    message: 'Chiến dịch đã được phê duyệt',
    data: updatedCampaign
  })
}

export const rejectCampaign = async (req, res) => {
  const { campaignId } = req.params
  const { reason } = req.body 
  console.log(reason)

  const updatedCampaign = await campaignServices.rejectCampaign(campaignId, reason)

  return res.status(200).json({
    success: true,
    message: 'Chiến dịch đã bị từ chối',
    data: updatedCampaign
  })
}

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
    res.json({ message: USER_MESSAGES.ACCEPT_CAMPAIGN_SUCCESS, result })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

export const rejectRequestHandler = async (req, res) => {
  try {
    const { campaignId, userId } = req.params
    const result = await campaignServices.rejectVolunteerInCampaign({ campaignId, userId })
    res.json({ message: USER_MESSAGES.ACCEPT_CAMPAIGN_SUCCESS, result })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

export const startCampaignHandler = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { postFb = "true" } = req.query; 

    const updated = await campaignServices.startCampaign(
      campaignId,
      postFb === "true" 
    );

    res.json({ message: CAMPAIGN_MESSAGE.START_CAMPAIGN_SUCCESS, campaign: updated });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const endCampaign = async (req, res) => {
  try {
    const campaignId = req.params.campaignId;
    const { certificate = 'true', mail = 'false' } = req.query;

    const generateCertificate = certificate !== 'false';
    const sendMail = mail === 'true';

    const result = await campaignServices.endCampaignAndIssueCertificates(
      campaignId,
      generateCertificate,
      sendMail
    );

    res.status(200).json({
      message: generateCertificate
        ? 'Chiến dịch đã kết thúc và chứng chỉ đã được tạo'
        : 'Chiến dịch đã kết thúc (không tạo chứng chỉ)',
      certificates: result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const withdrawFromCampaignHandler = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const userId = req.decoded_authorization.user_id;

    const result = await campaignServices.withdrawFromCampaign({ campaignId, userId });
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

