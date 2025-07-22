import Task from '../models/task.model.js';
import PhaseDay from '../models/phaseDay.model.js';
import mongoose from 'mongoose';
import Phase from '../models/phase.model.js'
import User from '../models/users.model.js';
import Campaign from '../models/campaign.model.js';
import Checkin from '../models/checkin.model.js'

export const getTasksByPhaseDayId = async (phaseDayId) => {
    if (!mongoose.Types.ObjectId.isValid(phaseDayId)) {
        throw new Error('ID phaseDay không hợp lệ');
    }

    const tasks = await Task.find({ phaseDayId })
        .populate('assignedUsers.userId')
        .lean();

    return tasks;
};

export const createTask = async (phaseDayId, data) => {
    if (!mongoose.Types.ObjectId.isValid(phaseDayId)) {
        throw new Error('ID phaseDay không hợp lệ');
    }

    const phaseDay = await PhaseDay.findById(phaseDayId);
    if (!phaseDay) throw new Error('Không tìm thấy phaseDay');

    const task = await Task.create({
        phaseDayId,
        title: data.title,
        description: data.description,
        status: data.status,
        assignedUsers: data.assignedUsers || []
    });

    phaseDay.tasks.push(task._id);
    await phaseDay.save();

    return task;
};

export const updateTask = async (taskId, data) => {
    const task = await Task.findById(taskId);
    if (!task) throw new Error('Không tìm thấy task');

    if (data.title) task.title = data.title;
    if (data.description) task.description = data.description;
    if (data.status) task.status = data.status;
    if (data.assignedUsers) task.assignedUsers = data.assignedUsers;

    await task.save();
    return task;
};

export const deleteTask = async (taskId) => {
    const task = await Task.findById(taskId);
    if (!task) throw new Error('Không tìm thấy task');

    await PhaseDay.findByIdAndUpdate(task.phaseDayId, {
        $pull: { tasks: task._id }
    });

    await task.deleteOne();
    return { message: 'Xoá task thành công' };
};

export const getUserTasksByCampaign = async (userId, campaignId) => {
    if (
        !mongoose.Types.ObjectId.isValid(userId) ||
        !mongoose.Types.ObjectId.isValid(campaignId)
    ) {
        throw new Error("Invalid userId or campaignId");
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const campaignObjectId = new mongoose.Types.ObjectId(campaignId);

    const tasks = await Task.aggregate([
        {
            $match: {
                "assignedUsers.userId": userObjectId,
            },
        },
        {
            $lookup: {
                from: "phasedays",
                localField: "phaseDayId",
                foreignField: "_id",
                as: "phaseDay",
            },
        },
        { $unwind: "$phaseDay" },
        {
            $lookup: {
                from: "phases",
                localField: "phaseDay.phaseId",
                foreignField: "_id",
                as: "phase",
            },
        },
        { $unwind: "$phase" },
        {
            $match: {
                "phase.campaignId": campaignObjectId,
            },
        },
        {
            $project: {
                title: 1,
                description: 1,
                phaseDayDate: "$phaseDay.date",
                phaseName: "$phase.name",
                campaignId: "$phase.campaignId",
                userSubmission: {
                    $arrayElemAt: [
                        {
                            $filter: {
                                input: "$assignedUsers",
                                as: "a",
                                cond: {
                                    $eq: ["$$a.userId", userObjectId],
                                }
                            }
                        },
                        0
                    ]
                }

            },
        },
        { $sort: { phaseDayDate: 1 } },
    ]);

    return tasks;
};

export const submitTaskService = async (taskId, userId, content, images) => {
    const task = await Task.findById(taskId);
    if (!task) {
        throw { status: 404, message: 'Task không tồn tại' };
    }

    const assignedUser = task.assignedUsers.find(au => au.userId.toString() === userId.toString());
    if (!assignedUser) {
        throw { status: 403, message: 'Bạn không được assigned cho task này' };
    }

    if (assignedUser.submission && assignedUser.submission.submittedAt) {
        throw { status: 400, message: 'Bạn đã nộp submission cho task này' };
    }

    assignedUser.submission = {
        content,
        images: images || [],
        submittedAt: new Date(),
        submittedBy: userId,
        submissionType: 'self'
    };

    await task.save();

    return task;
};

export const reviewTaskService = async (taskId, userId, staffId, status, evaluation, staffComment) => {
    const task = await Task.findById(taskId);
    if (!task) {
        throw { status: 404, message: 'Task không tồn tại' };
    }

    const assignedUser = task.assignedUsers.find(au => au.userId.toString() === userId.toString());
    if (!assignedUser) {
        throw { status: 404, message: 'User không được assigned cho task này' };
    }

    if (!assignedUser.submission || !assignedUser.submission.submittedAt) {
        throw { status: 400, message: 'Submission chưa được nộp, không thể review' };
    }

    if (assignedUser.review.status !== 'pending') {
        throw { status: 400, message: 'Task này đã được review' };
    }

    // Update review
    assignedUser.review = {
        status: status || 'approved',
        evaluation: evaluation || 'average',
        staffComment: staffComment || '',
        reviewedBy: staffId,
        reviewedAt: new Date()
    };

    await task.save();

    return task;
};

export const assignTaskToUsers = async (taskId, userIds) => {
    // Validation cơ bản
    if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new Error('User IDs must be a non-empty array');
    }

    // Kiểm tra task tồn tại
    const task = await Task.findById(taskId).populate('phaseDayId'); // Populate phaseDayId để lấy date ngay
    if (!task) {
        throw new Error('Task not found');
    }

    const newPhaseDay = await PhaseDay.findById(task.phaseDayId).populate('phaseId'); // Lấy PhaseDay và populate phaseId
    if (!newPhaseDay) {
        throw new Error('PhaseDay not found for this task');
    }

    const newDate = newPhaseDay.date; // Date của task mới (normalize to start of day nếu cần, nhưng giả sử date là Date without time)
    const newPhase = await Phase.findById(newPhaseDay.phaseId);
    if (!newPhase) {
        throw new Error('Phase not found for this PhaseDay');
    }
    const newCampaignId = newPhase.campaignId.toString(); // CampaignId của task mới

    // Kiểm tra tất cả user tồn tại, lọc duplicate, check approved trong campaign, và check conflict
    const validUsers = [];
    const existingUserIds = task.assignedUsers.map((assigned) => assigned.userId.toString());

    for (const userId of userIds) {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error(`User not found: ${userId}`);
        }
        if (existingUserIds.includes(userId.toString())) {
            continue; // Skip nếu đã assign vào task này
        }

        // Check user approved trong campaign
        const campaign = await Campaign.findById(newCampaignId);
        if (!campaign) {
            throw new Error('Campaign not found for this task');
        }
        const volunteer = campaign.volunteers.find((v) => v.user.toString() === userId);
        if (!volunteer || volunteer.status !== 'approved') {
            throw new Error(`User ${userId} is not approved in this campaign`);
        }

        // Check conflict: Tìm tasks khác mà user đã assign, có cùng ngày nhưng khác campaign
        const conflictingTasks = await Task.aggregate([
            {
                $match: {
                    'assignedUsers.userId': new mongoose.Types.ObjectId(userId),
                },
            },
            {
                $lookup: {
                    from: 'phasedays',
                    localField: 'phaseDayId',
                    foreignField: '_id',
                    as: 'phaseDay',
                },
            },
            {
                $unwind: '$phaseDay',
            },
            {
                $lookup: {
                    from: 'phases',
                    localField: 'phaseDay.phaseId',
                    foreignField: '_id',
                    as: 'phase',
                },
            },
            {
                $unwind: '$phase',
            },
            {
                $match: {
                    'phaseDay.date': newDate, // Cùng ngày (giả sử date là Date, có thể cần $eq và normalize nếu có time)
                    'phase.campaignId': { $ne: new mongoose.Types.ObjectId(newCampaignId) }, // Khác campaign
                },
            },
        ]);

        if (conflictingTasks.length > 0) {
            throw new Error(`User ${userId} has conflicting tasks on the same day in another campaign`);
        }

        validUsers.push(userId);
    }

    if (validUsers.length === 0) {
        throw new Error('All users are already assigned, not approved, or have conflicts');
    }

    // Thêm assignedUsers mới vào mảng
    const newAssigned = validUsers.map((userId) => ({
        userId,
        // Các trường khác mặc định theo schema
    }));
    task.assignedUsers.push(...newAssigned);

    // Lưu thay đổi
    await task.save();

    // Tạo và lưu notification vào DB cho từng user, rồi gửi socket
    for (const userId of validUsers) {
        const newNotification = new Notification({
            title: 'Nhiệm vụ mới được giao', // Title ngắn gọn, có thể customize dựa trên type
            content: `Bạn đã được giao nhiệm vụ mới: ${task.title}`, // Content là message chi tiết
            link: `/tasks/${task._id}`, // Link ví dụ đến task detail page (có thể adjust dựa trên frontend route)
            type: 'task_assigned',
            recipient: userId, // Sử dụng recipient thay vì userId
            // isRead default false, createdAt default Date.now
        });
        await newNotification.save();

        // Gửi socket với full notification object (bao gồm _id từ DB)
        sendNotificationToUser(userId, newNotification);
    }

    return task; // Trả về task đã cập nhật
};

export const getTasksByCampaignService = async (campaignId, userId) => {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const campaign = await Campaign.findById(campaignId)
        .populate('categories', 'name color')
        .lean();
    if (!campaign) throw new Error('Campaign không tồn tại');

    const isJoined = campaign.volunteers?.some(
        (v) => v.user.toString() === userId && v.status === 'approved'
    );
    if (!isJoined) throw new Error('Bạn chưa tham gia hoặc chưa được approve');
    const phases = await Phase.find({ _id: { $in: campaign.phases } }).lean();

    const phaseIds = phases.map((p) => p._id);
    const phaseDays = await PhaseDay.find({ phaseId: { $in: phaseIds } }).lean();

    const allTaskIds = phaseDays.flatMap((pd) => pd.tasks || []);
    const tasks = await Task.find({
        _id: { $in: allTaskIds },
        assignedVolunteers: userObjectId,
    }).lean();

    const taskMap = tasks.reduce((acc, task) => {
        acc[task._id.toString()] = task;
        return acc;
    }, {});
    const enrichedPhaseDays = phaseDays.map((pd) => ({
        ...pd,
        tasks: (pd.tasks || []).map((taskId) => taskMap[taskId.toString()]).filter(Boolean),
    }));
    // Checkin
    const checkins = await Checkin.find({
        userId: userObjectId,
        phasedayId: { $in: enrichedPhaseDays.map((pd) => pd._id) },
    }).select('phasedayId checkinTime method');

    const checkinMap = checkins.reduce((acc, c) => {
        acc[c.phasedayId.toString()] = {
            hasCheckedIn: true,
            checkinTime: c.checkinTime,
            method: c.method,
        };
        return acc;
    }, {});

    const phaseDayByPhase = enrichedPhaseDays.reduce((acc, pd) => {
        const key = pd.phaseId.toString();
        if (!acc[key]) acc[key] = [];
        acc[key].push({
            ...pd,
            checkinStatus: checkinMap[pd._id.toString()] || {
                hasCheckedIn: false,
                checkinTime: null,
                method: null,
            },
        });
        return acc;
    }, {});

    const finalPhases = phases.map((p) => ({
        ...p,
        phaseDays: phaseDayByPhase[p._id.toString()] || [],
    }));

    return {
        campaign: {
            _id: campaign._id,
            name: campaign.name,
            description: campaign.description,
            startDate: campaign.startDate,
            endDate: campaign.endDate,
            status: campaign.status,
            image: campaign.image,
            location: campaign.location,
            categories: campaign.categories,
        },
        phases: finalPhases,
    };
};