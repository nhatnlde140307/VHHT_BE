import { phaseService } from '../services/phase.service.js'

export const createPhase = async (req, res) => {
  const { campaignId } = req.params
  const { name, description, startDate, endDate } = req.body

  const newPhase = await phaseService.createPhase({
    campaignId,
    name,
    description,
    startDate,
    endDate
  })

  return res.status(201).json({
    success: true,
    message: 'Tạo giai đoạn chiến dịch thành công',
    data: newPhase
  })
}

export const updatePhase = async (req, res) => {
  const { phaseId } = req.params
  const { name, description, startDate, endDate, status } = req.body

  const updated = await phaseService.updatePhase(phaseId, {
    name,
    description,
    startDate,
    endDate,
    status
  })

  return res.status(200).json({
    success: true,
    message: 'Cập nhật giai đoạn thành công',
    data: updated
  })
}

export const deletePhase = async (req, res) => {
  const { phaseId } = req.params

  const deleted = await phaseService.deletePhase(phaseId)

  return res.status(200).json({
    success: true,
    message: 'Xoá giai đoạn thành công',
    data: deleted
  })
}

export const createPhaseDay = async (req, res) => {
  const { phaseId } = req.params
  const { date, checkinLocation } = req.body

  try {
    const result = await phaseService.createPhaseDay(phaseId, {
      date,
      checkinLocation
    })

    return res.status(201).json({
      success: true,
      message: 'Tạo ngày hoạt động thành công',
      data: result
    })
  } catch (err) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Lỗi khi tạo ngày hoạt động'
    })
  }
}

export const updatePhaseDay = async (req, res, next) => {
  try {
    const { phaseDayId } = req.params
    const updated = await phaseService.updatePhaseDay(phaseDayId, req.body)

    return res.status(200).json({
      success: true,
      message: 'Cập nhật ngày hoạt động thành công',
      data: updated
    })
  } catch (err) {
    next(err)
  }
}

export const deletePhaseDay = async (req, res, next) => {
  try {
    const { phaseDayId } = req.params
    const result = await phaseService.deletePhaseDay(phaseDayId)

    return res.status(200).json({
      success: true,
      message: result.message
    })
  } catch (err) {
    next(err)
  }
}

export const getPhasesByCampaignId = async (req, res, next) => {
  try {
    const { campaignId } = req.params
    const phases = await phaseService.getPhasesByCampaignId(campaignId)

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách giai đoạn và ngày hoạt động thành công',
      data: phases
    })
  } catch (err) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Lỗi khi lấy danh sách giai đoạn'
    })
  }
}