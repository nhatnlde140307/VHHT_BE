import { createCheckin } from "../services/checkin.service.js";

import { getCheckinStatusByPhaseday } from "../services/checkin.service.js";

export const getCheckinList = async (req, res) => {
  try {
    const { phasedayId } = req.params;
    if (!phasedayId) {
      return res.status(400).json({ message: "Thiếu phasedayId" });
    }

    const data = await getCheckinStatusByPhaseday(phasedayId);
    return res.json(data);
  } catch (err) {
    console.error("❌ Lỗi getCheckinList:", err);
    return res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

export const postCheckin = async (req, res) => {
  try {
    const { userId, campaignId, phaseId, phasedayId, method } = req.body;

    if (!userId || !campaignId || !phaseId || !phasedayId || !method) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc." });
    }

    const result = await createCheckin({ userId, campaignId, phaseId, phasedayId, method });
    return res.status(result.status).json({ message: result.message });

  } catch (err) {
    console.error("❌ Lỗi controller:", err);
    return res.status(500).json({ message: "Lỗi server khi xử lý check-in." });
  }
};

