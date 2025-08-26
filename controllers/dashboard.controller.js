import { buildDashboard } from "../services/dashboard.service.js";

export const getDashboard = async (req, res) => {
  try {
    const campaignId = req.params.id;
    const { from, to, sections } = req.query;
    const sectionList = sections ? sections.split(",") : null;

    const data = await buildDashboard({ campaignId, from, to, sections: sectionList });

    res.json({
      campaignId,
      range: { from: from || null, to: to || null },
      lastUpdated: new Date().toISOString(),
      ...data,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
