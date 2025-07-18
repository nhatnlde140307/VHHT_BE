import Task from '../models/task.model.js';
import PhaseDay from '../models/phaseDay.model.js';
import mongoose from 'mongoose';
import Phase from '../models/phase.model.js'

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

export const getTasksByUserAndCampaign = async (userId, campaignId) => {
    // Kiểm tra userId và campaignId hợp lệ
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        const error = new Error('Invalid userId');
        error.status = 400;
        throw error;
    }
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
        const error = new Error('Invalid campaignId');
        error.status = 400;
        throw error;
    }

    // Tìm các phase thuộc campaignId
    const phases = await Phase.find({ campaignId }).select('_id');

    if (!phases || phases.length === 0) {
        const error = new Error('No phases found for this campaign');
        error.status = 404;
        throw error;
    }

    const phaseIds = phases.map(phase => phase._id);

    const phaseDays = await PhaseDay.find({ phaseId: { $in: phaseIds } }).select('_id');

    if (!phaseDays || phaseDays.length === 0) {
        const error = new Error('No phase days found for this campaign');
        error.status = 404;
        throw error;
    }

    const phaseDayIds = phaseDays.map(phaseDay => phaseDay._id);

    const tasks = await Task.find({
        'assignedUsers.userId': userId,
        phaseDayId: { $in: phaseDayIds },
    })
        .populate({
            path: 'phaseDayId',
            select: 'date checkinLocation status',
            populate: {
                path: 'phaseId',
                select: 'name startDate endDate status campaignId',
                populate: {
                    path: 'campaignId',
                    select: 'name startDate endDate status',
                },
            },
        })
        .select('title description status checkinTime checkoutTime');


    if (!tasks || tasks.length === 0) {
        const error = new Error('No tasks found for this user in the specified campaign');
        error.status = 404;
        throw error;
    }

    const formattedTasks = tasks.map(task => {
        const user = Array.isArray(task.assignedUsers)
            ? task.assignedUsers.find(user => user.userId && user.userId.toString() === userId)
            : null;

        return {
            taskId: task._id,
            title: task.title,
            description: task.description,
            status: task.status?.status || null,
            submittedAt: task.status?.submittedAt || null,
            feedback: task.status?.feedback || null,
            evaluation: task.status?.evaluation || null,
            checkinTime: user?.checkinTime || null,
            checkoutTime: user?.checkoutTime || null,
            phaseDay: {
                date: task.phaseDayId?.date || null,
                location: task.phaseDayId?.checkinLocation || null,
                status: task.phaseDayId?.status || null,
            },
            phase: {
                name: task.phaseDayId?.phaseId?.name || null,
                startDate: task.phaseDayId?.phaseId?.startDate || null,
                endDate: task.phaseDayId?.phaseId?.endDate || null,
                status: task.phaseDayId?.phaseId?.status || null,
            },
            campaign: {
                name: task.phaseDayId?.phaseId?.campaignId?.name || null,
                startDate: task.phaseDayId?.phaseId?.campaignId?.startDate || null,
                endDate: task.phaseDayId?.phaseId?.campaignId?.endDate || null,
                status: task.phaseDayId?.phaseId?.campaignId?.status || null,
            },
        };
    });

    return formattedTasks;
};