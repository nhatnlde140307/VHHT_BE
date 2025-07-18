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


