import DonationServices from '../services/donationCampaign.service.js'


export const getDonationCampaigns = async (req, res) => {
  try {
    const campaigns = await DonationServices.getAll(req.query);
    res.status(200).json(campaigns);
  } catch (error) {
    console.error('❌ Lỗi lấy danh sách campaigns:', error.message);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

export const createDonationCampaign = async (req, res) => {
  try {
    const userId = req.decoded_authorization.user_id;
    const campaign = await DonationServices.create(req.body, userId);

    res.status(201).json({
      message: 'Tạo chiến dịch quyên góp thành công',
      campaign
    });
  } catch (error) {
    console.error('❌ Lỗi tạo campaign:', error.message);
    res.status(400).json({ message: error.message });
  }
};

export const approveDonationCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await DonationServices.approve(id);

    res.status(200).json({
      message: 'Chiến dịch đã được duyệt thành công',
      campaign: result
    });
  } catch (error) {
    res.status(400).json({
      message: error.message || 'Lỗi duyệt chiến dịch'
    });
  }
};

export const rejectDonationCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await DonationServices.reject(id);

    res.status(200).json({
      message: 'Chiến dịch đã bị từ chối',
      campaign: result
    });
  } catch (error) {
    res.status(400).json({
      message: error.message || 'Lỗi duyệt chiến dịch'
    });
  }
};