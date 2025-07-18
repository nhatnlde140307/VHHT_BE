import mongoose from 'mongoose'
import Phase from '../models/phase.model.js'
import Campaign from '../models/campaign.model.js'
import PhaseDay from '../models/phaseDay.model.js'
import { sendNotificationToUser } from '../socket/socket.js'
import Notification from '../models/notification.model.js'

async function createPhase({ campaignId, name, description, startDate, endDate }) {
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
        throw new Error('campaignId không hợp lệ');
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
        throw new Error('Không tìm thấy chiến dịch');
    }

    const phaseStart = new Date(startDate);
    const phaseEnd = new Date(endDate);

    if (phaseStart < campaign.startDate || phaseEnd > campaign.endDate) {
        throw new Error(`Ngày bắt đầu và kết thúc của giai đoạn phải nằm trong khoảng từ ${campaign.startDate.toLocaleDateString()} đến ${campaign.endDate.toLocaleDateString()} của chiến dịch`);
    }

    const phase = new Phase({
        campaignId,
        name,
        description,
        startDate: phaseStart,
        endDate: phaseEnd,
    });

    await phase.save();

    await Campaign.findByIdAndUpdate(campaignId, {
        $addToSet: { phases: phase._id }
    });

    return phase;
}

async function updatePhase(phaseId, payload) {
    if (!mongoose.Types.ObjectId.isValid(phaseId)) {
        throw new Error('Phase ID không hợp lệ');
    }

    const phase = await Phase.findById(phaseId);
    if (!phase) throw new Error('Không tìm thấy giai đoạn');

    const campaign = await Campaign.findById(phase.campaignId);
    if (!campaign) throw new Error('Không tìm thấy chiến dịch liên quan');

    const newStart = payload.startDate ? new Date(payload.startDate) : phase.startDate;
    const newEnd = payload.endDate ? new Date(payload.endDate) : phase.endDate;

    if (newStart > newEnd) {
        throw new Error('Ngày bắt đầu không được lớn hơn ngày kết thúc của giai đoạn');
    }

    if (newStart < campaign.startDate || newEnd > campaign.endDate) {
        throw new Error(`Thời gian của giai đoạn phải nằm trong chiến dịch từ ${campaign.startDate.toLocaleDateString()} đến ${campaign.endDate.toLocaleDateString()}`);
    }

    const fields = ['name', 'description', 'startDate', 'endDate', 'status'];
    fields.forEach(field => {
        if (payload[field] !== undefined) {
            phase[field] = payload[field];
        }
    });

    return await phase.save();
}


async function deletePhase(phaseId) {
    if (!mongoose.Types.ObjectId.isValid(phaseId)) {
        throw new Error('Phase ID không hợp lệ')
    }

    const phase = await Phase.findById(phaseId)
    if (!phase) throw new Error('Không tìm thấy giai đoạn')

    await Phase.findByIdAndDelete(phaseId)

    await Campaign.findByIdAndUpdate(phase.campaignId, {
        $pull: { phases: phase._id }
    })

    return phase
}

export const createPhaseDay = async (phaseId, data) => {
    if (!mongoose.Types.ObjectId.isValid(phaseId)) {
        const error = new Error('ID phase không hợp lệ')
        error.status = 400
        throw error
    }

    const phase = await Phase.findById(phaseId)
    if (!phase) {
        const error = new Error('Không tìm thấy phase')
        error.status = 404
        throw error
    }

    const isExist = await PhaseDay.findOne({ phaseId, date: data.date })
    if (isExist) {
        const error = new Error('Ngày này đã tồn tại trong phase')
        error.status = 409
        throw error
    }

    const phaseDay = await PhaseDay.create({
        phaseId,
        date: data.date,
        checkinLocation: {
            type: 'Point',
            coordinates: data.checkinLocation.coordinates,
            address: data.checkinLocation.address
        }
    })

    try {
        phase.phaseDays.push(phaseDay._id)
        await phase.save()
        console.log('✅ Đã push phaseDay vào phase:', phaseDay._id.toString())
    } catch (err) {
        console.error('❌ Lỗi khi cập nhật phase.phaseDays:', err.message)
    }

    return phaseDay
}

export async function updatePhaseDay(phaseDayId, data) {
    if (!mongoose.Types.ObjectId.isValid(phaseDayId)) {
        throw new Error('ID phaseDay không hợp lệ')
    }

    const phaseDay = await PhaseDay.findById(phaseDayId)
    if (!phaseDay) throw new Error('Không tìm thấy phaseDay')

    if (data.date) phaseDay.date = new Date(data.date)

    if (data.checkinLocation) {
        phaseDay.checkinLocation = {
            type: 'Point',
            coordinates: data.checkinLocation.coordinates,
            address: data.checkinLocation.address
        }
    }
    if (data.status) {
        phaseDay.status = data.status
    }
    await phaseDay.save()
    return phaseDay
}

export async function deletePhaseDay(phaseDayId) {
    if (!mongoose.Types.ObjectId.isValid(phaseDayId)) {
        throw new Error('ID phaseDay không hợp lệ')
    }

    const phaseDay = await PhaseDay.findById(phaseDayId)
    if (!phaseDay) throw new Error('Không tìm thấy phaseDay')

    await Phase.findByIdAndUpdate(phaseDay.phaseId, {
        $pull: { phaseDays: phaseDay._id }
    })

    await phaseDay.deleteOne()
    return { message: 'Xoá phaseDay thành công' }
}

export async function getPhasesByCampaignId(campaignId) {
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
        throw new Error('campaignId không hợp lệ')
    }

    const campaign = await Campaign.findById(campaignId)
    if (!campaign) {
        throw new Error('Không tìm thấy chiến dịch')
    }

    const phases = await Phase.find({ campaignId })
        .populate({
            path: 'phaseDays',
            select: 'date checkinLocation status'
        })
        .lean()

    return phases
}

export async function startPhaseService(phaseId) {
    const phase = await Phase.findById(phaseId).populate('campaignId');
    if (!phase) {
        throw new Error('phaseId không hợp lệ')
    }

    const campaign = phase.campaignId;

    if (phase.status !== 'upcoming') {
        throw new Error('Phase is not in upcoming status')
    }

    const currentDate = new Date();
    // if (phase.startDate > currentDate) {
    //     throw new ApiError(400, 'Phase start date has not arrived yet');
    // }

    phase.status = 'in-progress';
    await phase.save();

    // Optional: Cập nhật first phaseDay
    if (phase.phaseDays.length > 0) {
        const firstPhaseDay = await PhaseDay.findById(phase.phaseDays[0]);
        if (firstPhaseDay && firstPhaseDay.status === 'upcoming' && firstPhaseDay.date <= currentDate) {
            firstPhaseDay.status = 'in-progress';
            await firstPhaseDay.save();
        }
    }

    // Tạo và gửi notification cho volunteers
    const volunteers = campaign.volunteers.filter(v => v.status === 'approved');
    for (const volunteer of volunteers) {
        const recipientId = volunteer.user;

        const newNotification = new Notification({
            title: `Phase "${phase.name}" của chiến dịch "${campaign.name} đã bắt đầu"`,
            content: `Phase đã bắt đầu, hãy check task của bạn.`,
            link: `/campaigns/${campaign._id}/phases/${phase._id}`,
            type: 'system',
            recipient: recipientId,
            isRead: false,
        });

        await newNotification.save();

        // Gửi qua socket
        try {
            sendNotificationToUser(recipientId, newNotification);
        } catch (socketError) {
            console.error(`Failed to send socket noti to user ${recipientId}:`, socketError);
        }
    }

    return phase;
}

export const phaseService = {
    createPhase,
    updatePhase,
    deletePhase,
    createPhaseDay,
    updatePhaseDay,
    deletePhaseDay,
    getPhasesByCampaignId,
    startPhaseService
}