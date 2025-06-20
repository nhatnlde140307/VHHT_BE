import { config } from 'dotenv'
import axios from 'axios'
import { AI_EXENTD_MESSAGE } from '../constants/messages.js'
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { transporter } from '../utils/nodemailerConfig.js';
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
                    temperature: 0.8
                },
                {
                    headers: {
                        Authorization: `Bearer ${process.env.GPT_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            )

            return response.data.choices[0]?.message?.content?.trim() || AI_EXENTD_MESSAGE.ERROR_IN_CONTENT
        } catch (error) {
            console.error('AI Error:', error?.response?.data || error.message)
            return AI_EXENTD_MESSAGE.ERROR_IN_CONTENT
        }
    }

    async generateThankYouEmail({ recipientName,
        campaignName,
        contributionDetails,
        senderName,
        tone = 'thân thiện',
        evaluationText = '' }) {
        const prompt = `
Viết một email cảm ơn bằng tiếng Việt, xưng hô là "bạn", giọng văn ${tone}.
Gửi tới ${recipientName} vì đã ${contributionDetails} trong chiến dịch "${campaignName}".

Hãy nhấn mạnh rằng: 🎖️ ${evaluationText} – nên đặt riêng thành một câu hoặc dòng dễ nhìn thấy.

Email nên chân thành, khoảng 120–150 từ, dễ đọc, có thể kết thúc bằng lời cảm ơn và tên người gửi là ${senderName}.
`;

        try {
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: 'Bạn là một chuyên gia viết email cảm ơn thiện nguyện bằng tiếng Việt.' },
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: 300,
                    temperature: 0.7
                },
                {
                    headers: {
                        Authorization: `Bearer ${process.env.GPT_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            )

            return response.data.choices[0]?.message?.content?.trim()
        } catch (error) {
            console.error('AI Error (Email):', error?.response?.data || error.message)
            return 'Cảm ơn bạn đã tham gia chiến dịch.'
        }
    }

    async sendDonationSuccessEmail(toEmail, data, attachmentPath = null) {
        const templatePath = path.join(process.cwd(), 'templates', 'donation-bill-email.html');
        let htmlTemplate = fs.readFileSync(templatePath, 'utf-8');

        htmlTemplate = htmlTemplate
            .replace('Nguyễn Văn A', data.donorName || 'Ẩn danh')
            .replace('200.000 VND', `${data.amount.toLocaleString()} VND`)
            .replace('ZLP_24062025_123456', data.transactionCode)
            .replace('Ủng hộ lũ lụt miền Trung', data.campaignTitle)
            .replace('20/06/2025 11:50:00', data.date);

        const mailOptions = {
            from: `"ZaloPay Xác nhận giao dịch" <${process.env.ZALOPAY_EMAIL}>`,
            to: toEmail,
            subject: 'Xác nhận giao dịch ủng hộ chiến dịch thành công',
            html: htmlTemplate,
            attachments: attachmentPath ? [{
                filename: 'bien-nhan.pdf',
                path: attachmentPath
            }] : []
        };

        await transporter.sendMail(mailOptions);
    }
}

export default new AiService()