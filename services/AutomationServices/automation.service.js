import { config } from 'dotenv'
import axios from 'axios'
import { AI_EXENTD_MESSAGE } from '../constants/messages.js'
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { transporter } from '../utils/nodemailerConfig.js';
config()

class AutoServices {
    async postFb({ title, description, location, startDate, endDate, tone, type }) {
        const prompt = `
Viết một bài đăng Facebook ngắn (~100 từ), bằng tiếng Việt, giọng văn ${tone}, cho chiến dịch tình nguyện ở Hà Tĩnh sau:
- Tên chiến dịch: ${title}
- Mô tả chiến dịch: ${description}
- Địa điểm: ${location}
- Thời gian: từ ${startDate} đến ${endDate}
Nội dung cần truyền tải cảm xúc, kêu gọi cộng đồng cùng tham gia.
        `
        try {
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: 'Bạn là một chuyên gia viết nội dung thiện nguyện chuyên nghiệp.' },
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: 300,
                    temperature: 0.9
                },
                {
                    headers: {
                        Authorization: `Bearer ${process.env.GPT_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            )
            await axios.post("https://hooks.zapier.com/hooks/catch/23147694/2v3x9r1/", {
                                title: updated.title,
                                content,
                                image: updated.thumbnail,
                                link: `https://your-site.com/donation-campaigns/${updated._id}`,
                            });

            return response.data.choices[0]?.message?.content?.trim() || AI_EXENTD_MESSAGE.ERROR_IN_CONTENT
        } catch (error) {
            console.error('AI Error:', error?.response?.data || error.message)
            return AI_EXENTD_MESSAGE.ERROR_IN_CONTENT
        }
    }

    async getPublicIdFromUrl(url) {
        const getPublicIdFromUrl = (url) => {
            const start = url.indexOf('/upload/') + 8
            const end = url.lastIndexOf('.')
            const publicId = url.substring(start, end)
            const decoded = decodeURIComponent(publicId)
            console.log('🎯 Extracted publicId =', decoded)
            return decoded
        }

    }
}

export default new AutoServices()