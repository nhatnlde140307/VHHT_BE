import { config } from 'dotenv';
import DonationCampaign from '../models/donationCampaign.model.js';
import { MailGenerator, transporter } from '../utils/nodemailerConfig.js'
import DonorProfile from '../models/donorProfile.model.js';
import User from '../models/users.model.js';
import OrganizationInfo from '../models/organizationInfo.model.js';

config();

class DonationServices {
    async create(data, userId) {
        const {
            title,
            description,
            goalAmount,
            thumbnail,
            images = [],
            tags = [],
            createdBy
        } = data;

        if (!title || !description || !goalAmount || !createdBy) {
            throw new Error('Thiếu trường bắt buộc');
        }

        const newCampaign = new DonationCampaign({
            title,
            description,
            goalAmount,
            thumbnail,
            images,
            tags,
            createdBy : userId,
            currentAmount: 0
        });

        return await newCampaign.save();
    }

    async approve(id) {
        const updated = await DonationCampaign.findByIdAndUpdate(
            id,
            { approvalStatus: 'approved' },
            { new: true }
        );
        console.log(updated)

        if (!updated) {
            throw new Error('Không tìm thấy chiến dịch');
        }

        const creator = await User.findById(updated.createdBy);
        console.log(creator)
        if (creator && creator.email) {
            const emailContent = {
                body: {
                    name: creator.name || creator.email,
                    intro: 'Chiến dịch quyên góp của tổ chức đã được phê duyệt.',
                    content: `Chiến dịch "${updated.title}" đã được admin xác nhận và sẽ hiển thị công khai.`,
                    outro: 'Nếu bạn không tạo chiến dịch này, vui lòng liên hệ lại VHHT.'
                }
            };
            const mailBody = MailGenerator.generate(emailContent)

            await transporter.sendMail({
                from: process.env.EMAIL,
                to: creator.email,
                subject: 'Verify your VHHT account',
                html: mailBody
            })
        }

        return updated;
    }
}

export default new DonationServices();