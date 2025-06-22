import aiServive from "../services/ai.servive.js"
import { AI_EXENTD_MESSAGE } from "../constants/messages.js"

export const generateContentController = async (req, res) => {
  try {
    const {
      title,
      description,
      location,
      startDate,
      endDate,
      tone = AI_EXENTD_MESSAGE.DEFAULT_TONE_AI
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
    res.status(500).json({ error: AI_EXENTD_MESSAGE.ERROR_IN_CONTENT })
  }
}