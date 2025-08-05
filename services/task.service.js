import Task from "../models/task.model.js";
import PhaseDay from "../models/phaseDay.model.js";
import mongoose from "mongoose";
import Phase from "../models/phase.model.js";
import User from "../models/users.model.js";
import Campaign from "../models/campaign.model.js";
import Checkin from "../models/checkin.model.js";
import Notification from "../models/notification.model.js";
import { sendNotificationToUser } from "../socket/socket.js";

export const getTasksByPhaseDayId = async (phaseDayId) => {
  if (!mongoose.Types.ObjectId.isValid(phaseDayId)) {
    throw new Error("ID phaseDay không hợp lệ");
  }

  const tasks = await Task.find({ phaseDayId })
    .populate("assignedUsers.userId")
    .lean();

  return tasks;
};

export const createTask = async (phaseDayId, data) => {
  if (!mongoose.Types.ObjectId.isValid(phaseDayId)) {
    throw new Error("ID phaseDay không hợp lệ");
  }

  const phaseDay = await PhaseDay.findById(phaseDayId);
  if (!phaseDay) throw new Error("Không tìm thấy phaseDay");

  const task = await Task.create({
    phaseDayId,
    title: data.title,
    description: data.description,
    status: data.status,
    leaderId: data.leaderId,
    assignedUsers: data.assignedUsers || [],
  });

  phaseDay.tasks.push(task._id);
  await phaseDay.save();

  return task;
};

export const updateTask = async (taskId, data) => {
  const task = await Task.findById(taskId);
  if (!task) throw new Error("Không tìm thấy task");

  if (data.title) task.title = data.title;
  if (data.description) task.description = data.description;
  if (data.status) task.status = data.status;
  if (data.assignedUsers) task.assignedUsers = data.assignedUsers;

  await task.save();
  return task;
};

export const updateTaskStatusService = async (taskId, status) => {
  const task = await Task.findById(taskId);
  if (!task) throw { status: 404, message: "Không tìm thấy task" };

  if (!["in_progress", "submitted", "completed"].includes(status)) {
    throw { status: 400, message: "Trạng thái không hợp lệ" };
  }

  task.status = status;
  await task.save();
  return task;
};

export const deleteTask = async (taskId) => {
  const task = await Task.findById(taskId);
  if (!task) throw new Error("Không tìm thấy task");

  await PhaseDay.findByIdAndUpdate(task.phaseDayId, {
    $pull: { tasks: task._id },
  });

  await task.deleteOne();
  return { message: "Xoá task thành công" };
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
    { $match: { "assignedUsers.userId": userObjectId } },
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
    { $match: { "phase.campaignId": campaignObjectId } },
    {
      $project: {
        title: 1,
        description: 1,
        phaseDayDate: "$phaseDay.date",
        phaseName: "$phase.name",
        campaignId: "$phase.campaignId",
      },
    },
    { $sort: { phaseDayDate: 1 } },
  ]);

  return tasks;
};

export const submitTaskService = async (taskId, userId, content, images) => {
  const task = await Task.findById(taskId);
  if (!task) throw { status: 404, message: "Task không tồn tại" };

  if (task.submission?.submittedAt) {
    throw { status: 400, message: "Task đã được leader nộp" };
  }

  if (task.leaderId.toString() !== userId.toString()) {
    throw { status: 403, message: "Chỉ leader được phép nộp task" };
  }

  task.submission = {
    content,
    images,
    submittedAt: new Date(),
    submittedBy: userId,
  };

  task.status = "submitted";
  await task.save();

  return task;
};

export const reviewPeerTaskService = async (
  taskId,
  reviewerId,
  revieweeId,
  score,
  comment
) => {
  const task = await Task.findById(taskId);
  if (!task) throw { status: 404, message: "Task không tồn tại" };

  if (reviewerId === revieweeId) {
    throw { status: 400, message: "Không thể tự review bản thân" };
  }

  const alreadyReviewed = task.peerReviews.find(
    (r) =>
      r.reviewer.toString() === reviewerId &&
      r.reviewee.toString() === revieweeId
  );
  if (alreadyReviewed) {
    throw { status: 400, message: "Bạn đã review người này rồi" };
  }

  task.peerReviews.push({
    reviewer: reviewerId,
    reviewee: revieweeId,
    score,
    comment,
  });

  await task.save();
  return task;
};

export const staffReviewTaskService = async (
  taskId,
  staffId,
  finalScore,
  overallComment
) => {
  const task = await Task.findById(taskId);
  if (!task) throw { status: 404, message: "Task không tồn tại" };

  task.staffReview = {
    evaluatedBy: staffId,
    finalScore,
    overallComment,
    reviewedAt: new Date(),
  };

  task.status = "completed";
  await task.save();
  return task;
};

export const assignTaskToUsers = async (taskId, userIds) => {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new Error("User IDs must be a non-empty array");
  }

  const task = await Task.findById(taskId).populate("phaseDayId");
  if (!task) throw new Error("Task not found");

  const newPhaseDay = await PhaseDay.findById(task.phaseDayId).populate(
    "phaseId"
  );
  if (!newPhaseDay) throw new Error("PhaseDay not found");

  const newDate = newPhaseDay.date;
  const newPhase = await Phase.findById(newPhaseDay.phaseId);
  if (!newPhase) throw new Error("Phase not found");

  const newCampaignId = newPhase.campaignId.toString();
  const validUsers = [];
  const existingUserIds = task.assignedUsers.map((u) => u.userId.toString());

  for (const userId of userIds) {
    if (existingUserIds.includes(userId.toString())) continue;

    const user = await User.findById(userId);
    if (!user) throw new Error(`User not found: ${userId}`);

    const campaign = await Campaign.findById(newCampaignId);
    const volunteer = campaign.volunteers.find(
      (v) => v.user.toString() === userId && v.status === "approved"
    );
    if (!volunteer)
      throw new Error(`User ${userId} chưa được duyệt trong campaign`);

    const conflictingTasks = await Task.aggregate([
      {
        $match: { "assignedUsers.userId": new mongoose.Types.ObjectId(userId) },
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
          "phaseDay.date": newDate,
          "phase.campaignId": {
            $ne: new mongoose.Types.ObjectId(newCampaignId),
          },
        },
      },
    ]);

    if (conflictingTasks.length > 0)
      throw new Error(`User ${userId} có nhiệm vụ trùng lịch khác campaign`);

    validUsers.push(userId);
  }

  const newAssigned = validUsers.map((userId) => ({ userId }));
  task.assignedUsers.push(...newAssigned);
  await task.save();

  for (const userId of validUsers) {
    const newNotification = new Notification({
      title: "Nhiệm vụ mới được giao",
      content: `Bạn đã được giao nhiệm vụ: ${task.title}`,
      link: `/tasks/${task._id}`,
      type: "task_assigned",
      recipient: userId,
    });
    await newNotification.save();
    sendNotificationToUser(userId, newNotification);
  }

  return task;
};

export const getTasksByVolunteerAndMonth = async (userId, year, month) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid userId");
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  const tasks = await Task.aggregate([
    { $match: { "assignedUsers.userId": userObjectId } },
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
      $match: {
        "phaseDay.date": {
          $gte: startOfMonth,
          $lte: endOfMonth,
        },
      },
    },
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
      $lookup: {
        from: "campaigns",
        localField: "phase.campaignId",
        foreignField: "_id",
        as: "campaign",
      },
    },
    { $unwind: "$campaign" },
    {
      $project: {
        _id: 1,
        title: 1,
        description: 1,
        status: 1,
        phaseDayDate: "$phaseDay.date",
        phaseName: "$phase.name",
        campaignName: "$campaign.name",
        campaignId: "$phase.campaignId",
      },
    },
    { $sort: { phaseDayDate: 1 } },
  ]);

  return tasks;
};

export const getTasksByCampaignService = async (campaignId, userId) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const campaign = await Campaign.findById(campaignId)
    .populate("categories", "name color")
    .lean();
  if (!campaign) throw new Error("Campaign không tồn tại");

  const isJoined = campaign.volunteers?.some(
    (v) => v.user.toString() === userId && v.status === "approved"
  );
  if (!isJoined) throw new Error("Bạn chưa tham gia hoặc chưa được approve");

  const phases = await Phase.find({
    _id: { $in: campaign.phases || [] },
  }).lean();
  const phaseIds = phases.map((p) => p._id);
  const phaseDays = await PhaseDay.find({ phaseId: { $in: phaseIds } }).lean();
  const allTaskIds = phaseDays.flatMap((pd) => pd.tasks || []);

  // Update the Task query to populate assignedUsers with user names and avatars
  const tasks = await Task.find({
    _id: { $in: allTaskIds },
    "assignedUsers.userId": userObjectId,
  })
    .populate({
      path: "assignedUsers.userId",
      select: "fullName avatar", // Include both fullName and avatar fields from User
      model: "User",
    })
    .lean();

  // Map tasks to include user names and avatars in assignedUsers
  const taskMap = tasks.reduce((acc, task) => {
    const taskWithUserDetails = {
      ...task,
      assignedUsers: task.assignedUsers.map((au) => ({
        ...au,
        userName: au.userId?.fullName || "", // Add the user's name
        avatar: au.userId?.avatar || "", // Add the user's avatar (URL or path)
      })),
    };
    acc[task._id.toString()] = taskWithUserDetails;
    return acc;
  }, {});

  const enrichedPhaseDays = phaseDays.map((pd) => ({
    ...pd,
    tasks: (pd.tasks || [])
      .map((taskId) => taskMap[taskId.toString()])
      .filter(Boolean),
  }));

  const checkins = await Checkin.find({
    userId: userObjectId,
    phasedayId: { $in: enrichedPhaseDays.map((pd) => pd._id) },
  }).select("phasedayId checkinTime method");

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
