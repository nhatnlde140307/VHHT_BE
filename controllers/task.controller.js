import * as taskService from '../services/task.service.js';

export const getTasksByPhaseDayId = async (req, res, next) => {
    try {
        const tasks = await taskService.getTasksByPhaseDayId(req.params.phaseDayId);
        res.status(200).json({ success: true, message: 'Lấy danh sách task thành công', data: tasks });
    } catch (err) {
        next(err);
    }
};

export const createTask = async (req, res, next) => {
    try {
        const task = await taskService.createTask(req.params.phaseDayId, req.body);
        res.status(201).json({ success: true, message: 'Tạo task thành công', data: task });
    } catch (err) {
        next(err);
    }
};

export const updateTask = async (req, res, next) => {
    try {
        const task = await taskService.updateTask(req.params.taskId, req.body);
        res.status(200).json({ success: true, message: 'Cập nhật task thành công', data: task });
    } catch (err) {
        next(err);
    }
};

export const deleteTask = async (req, res, next) => {
    try {
        const result = await taskService.deleteTask(req.params.taskId);
        res.status(200).json({ success: true, message: result.message });
    } catch (err) {
        next(err);
    }
};

export const getTasksByUserAndCampaign = async (req, res, next) => {
  try {
    const userId = req.decoded_authorization.user_id;
    const { campaignId } = req.params;

    if (!campaignId) {
      return res.status(400).json({ message: "campaignId is required" });
    }

    const rawTasks = await taskService.getUserTasksByCampaign(userId, campaignId);

    const formattedTasks = rawTasks.map((task) => {
      const submission = task.userSubmission?.submission || {};
      const review = task.userSubmission?.review || {};

      return {
        taskId: task._id,
        title: task.title,
        description: task.description,
        phaseDay: {
          date: task.phaseDayDate,
          phaseName: task.phaseName,
        },
        submission: {
          submittedAt: submission.submittedAt || null,
          submittedBy: submission.submittedBy || null,
          status: review?.status || "pending",
          evaluation: review?.evaluation || null,
          reviewedAt: review?.reviewedAt || null,
          staffComment: review?.staffComment || null,
        },
      };
    });

    res.json(formattedTasks);
  } catch (err) {
    console.error("🔥 Controller error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
}


