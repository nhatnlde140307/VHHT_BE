import Checkin from "../models/checkin.model.js";
import Phase from "../models/phase.model.js"
import PhaseDay from "../models/phaseDay.model.js"
import Campaign from "../models/campaign.model.js";
import User from "../models/users.model.js";
// import dayjs from "dayjs";

export const createCheckin = async ({ userId, campaignId, phaseId, phasedayId, method }) => {
    const existed = await Checkin.findOne({ userId, phasedayId });
    if (existed) {
        return { status: 409, message: "Đã check-in hôm nay rồi!" };
    }

    const newCheckin = new Checkin({
        userId,
        campaignId,
        phaseId,
        phasedayId,
        method,
        createdAt: new Date()
    });

    await newCheckin.save();
    return { status: 201, message: "✅ Check-in đã được lưu!" };
};

export const getCheckinStatusByPhaseday = async (phasedayId) => {
    const phaseday = await PhaseDay.findById(phasedayId);
    if (!phaseday) throw new Error("Phaseday không tồn tại");

    const phase = await Phase.findById(phaseday.phaseId);
    if (!phase) throw new Error("Phase không tồn tại");

    const campaign = await Campaign.findById(phase.campaignId).lean();
    if (!campaign) throw new Error("Campaign không tồn tại");

    const approvedVolunteers = campaign.volunteers
        .filter(v => v.status === "approved")
        .map(v => v.user.toString());

    const users = await User.find({ _id: { $in: approvedVolunteers } }, "fullName").lean();

    const start = dayjs().startOf("day").toDate();
    const end = dayjs().endOf("day").toDate();

    const checkins = await Checkin.find({
        phasedayId,
        createdAt: { $gte: start, $lte: end }
    }).lean();

    const checkinMap = new Map();
    checkins.forEach(c => {
        checkinMap.set(c.userId.toString(), {
            method: c.method,
            checkinAt: c.createdAt
        });
    });

    const result = users.map(user => {
        const check = checkinMap.get(user._id.toString());
        return {
            userId: user._id,
            fullName: user.fullName,
            checkin: !!check,
            ...(check && {
                method: check.method,
                checkinAt: check.checkinAt
            })
        };
    });

    return result;
};