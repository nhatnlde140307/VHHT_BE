import aiServive from "../services/ai.servive.js"

export const generateContentController = async (req, res) => {
  try {
    const {
      title,
      description,
      location,
      startDate,
      endDate,
      tone = 'truyền cảm hứng'
    } = req.body

    const content = await aiServive.generateCampaignContent({
      title,
      description,
      location,
      startDate,
      endDate,
      tone
    })

    res.json({ content })
  } catch (err) {
    console.error(err.message)
    res.status(500).json({ error: 'Lỗi khi tạo nội dung từ AI' })
  }
}