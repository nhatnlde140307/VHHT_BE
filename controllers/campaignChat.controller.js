import Campaign from '../models/campaign.model.js';

export const checkChatAccess = async (req, res) => {
  const { id: campaignId, userId } = req.params;

  const campaign = await Campaign.findById(campaignId);
  if (!campaign) return res.status(404).json({ message: "Campaign not found" });

  const isVolunteer = campaign.volunteers.some(
    (v) => v.user.toString() === userId && v.status === "approved"
  );

  if (!isVolunteer) {
    return res.status(403).json({ message: "Bạn không có quyền tham gia chat trong campaign này 😤" });
  }

  res.status(200).json({ message: "Access granted" });
};
