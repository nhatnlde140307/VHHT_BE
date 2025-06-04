import { config } from 'dotenv'
import axios from 'axios'
import { AI_EXENTD_MESSAGE } from '../constants/messages.js'

config()

class AiService {
    async generateCampaignContent({ title, description, location, startDate, endDate, tone }) {
    const prompt = `
            Viết một bài đăng Facebook ngắn (~100 từ), bằng tiếng Việt, giọng văn ${tone}, cho chiến dịch thiện nguyện sau:
            - Tên chiến dịch: ${title}  
            - Mô tả chiến dịch: ${description}
            - Địa điểm: ${location}
            - Thời gian: từ ${startDate} đến ${endDate}
            Nội dung cần truyền tải cảm xúc, kêu gọi cộng đồng cùng tham gia.
`
        const response = await axios.post(
            'https://api.cohere.ai/v1/generate',
            {
                model: 'command',
                prompt,
                max_tokens: 300,
                temperature: 0.7
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.COHERE_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        )
        return response.data.generations[0]?.text || AI_EXENTD_MESSAGE.ERROR_IN_CONTENT
    }
}

export default new AiService()