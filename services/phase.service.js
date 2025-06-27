import mongoose from 'mongoose'
import Phase from '../models/phase.model.js'
import Campaign from '../models/campaign.model.js'
import PhaseDay from '../models/phaseDay.model.js'

async function createPhase({ campaignId, name, description, startDate, endDate }) {
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
        throw new Error('campaignId không hợp lệ')
    }

    const campaign = await Campaign.findById(campaignId)
    if (!campaign) {
        throw new Error('Không tìm thấy chiến dịch')
    }

    const phase = new Phase({
        campaignId,
        name,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
    })

    await phase.save()

    await Campaign.findByIdAndUpdate(campaignId, {
        $addToSet: { phases: phase._id }
    })

    return phase
}

async function updatePhase(phaseId, payload) {
    if (!mongoose.Types.ObjectId.isValid(phaseId)) {
        throw new Error('Phase ID không hợp lệ')
    }

    const phase = await Phase.findById(phaseId)
    if (!phase) throw new Error('Không tìm thấy giai đoạn')

    const fields = ['name', 'description', 'startDate', 'endDate', 'status']
    fields.forEach(field => {
        if (payload[field] !== undefined) {
            phase[field] = payload[field]
        }
    })

    return await phase.save()
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
export const phaseService = {
    createPhase,
    updatePhase,
    deletePhase,
    createPhaseDay,
    updatePhaseDay,
    deletePhaseDay
}
