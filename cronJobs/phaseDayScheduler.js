import cron from 'node-cron';
import PhaseDay from "../models/phaseDay.model.js";
import Phase from "../models/phase.model.js";
import Campaign from "../models/campaign.model.js";
import { sendNotificationToUser } from '../socket/socket.js';
import Notification from '../models/notification.model.js';

cron.schedule('* * * * *', async () => {

    try {
        const currentDate = new Date();
        
        // Truy vấn tất cả PhaseDay có ngày hôm nay và trạng thái 'upcoming'
        const phaseDaysToStart = await PhaseDay.find({
            date: {
                $gte: new Date(currentDate.setHours(0, 0, 0, 0)),
                $lt: new Date(currentDate.setHours(23, 59, 59, 999))
            },
            status: 'upcoming'
        });

        if (phaseDaysToStart.length > 0) {
            for (let phaseDay of phaseDaysToStart) {
                if (phaseDay.status !== 'in-progress') {
                    phaseDay.status = 'in-progress';
                    await phaseDay.save();
                    console.log(`PhaseDay ${phaseDay._id} đã được cập nhật trạng thái thành "in-progress".`);

                    // Truy vấn thông tin Phase và Campaign liên quan
                    const phase = await Phase.findById(phaseDay.phaseId).populate('campaignId');
                    const campaign = phase ? phase.campaignId : null;

                    if (campaign) {
                        // Lấy tất cả tình nguyện viên tham gia chiến dịch này
                        const volunteers = campaign.volunteers;

                        // Gửi thông báo cho tất cả tình nguyện viên
                        for (let volunteer of volunteers) {
                            const userId = volunteer.user; // ID người dùng

                            // Tạo thông báo
                            const newNotification = new Notification({
                                title: "Ngày mới đã mở checkin",
                                content: `Ngày mới đã được bắt đầu ở Giai đoạn: ${phase.name}, chiến dịch: ${campaign.name}`,
                                link: `/campaigns/${campaign._id}`, // Có thể thêm link nếu cần
                                type: "task_assigned",
                                recipient: userId,
                            });
                            await newNotification.save();

                            // Gửi thông báo qua socket
                            sendNotificationToUser(userId, newNotification);
                        }

                        // Gửi thông báo cho người tạo chiến dịch
                        const creatorId = campaign.createdBy; // Lấy ID người tạo chiến dịch

                        const creatorNotification = new Notification({
                            title: "PhaseDay của chiến dịch đã được bắt đầu",
                            content: `PhaseDay trong chiến dịch "${campaign.name}", Giai đoạn: ${phase.name} đã được bắt đầu.`,
                            link: "", // Có thể thêm link nếu cần
                            type: "task_assigned",
                            recipient: creatorId,
                        });
                        await creatorNotification.save();

                        // Gửi thông báo qua socket cho người tạo chiến dịch
                        sendNotificationToUser(creatorId, creatorNotification);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Lỗi khi kiểm tra PhaseDay:', error);
    }
});