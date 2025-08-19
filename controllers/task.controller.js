import * as taskService from "../services/task.service.js";

export const getTasksByPhaseDayId = async (req, res, next) => {
  try {
    const tasks = await taskService.getTasksByPhaseDayId(req.params.phaseDayId);
    res
      .status(200)
      .json({
        success: true,
        message: "Lấy danh sách task thành công",
        data: tasks,
      });
  } catch (err) {
    next(err);
  }
};

export const createTask = async (req, res, next) => {
  try {
    const task = await taskService.createTask(req.params.phaseDayId, req.body);
    res
      .status(201)
      .json({ success: true, message: "Tạo task thành công", data: task });
  } catch (err) {
    next(err);
  }
};

export const updateTask = async (req, res, next) => {
  try {
    const task = await taskService.updateTask(req.params.taskId, req.body);
    res
      .status(200)
      .json({ success: true, message: "Cập nhật task thành công", data: task });
  } catch (err) {
    next(err);
  }
};

export const updateTaskStatus = async (req, res, next) => {
  try {
    const task = await taskService.updateTaskStatusService(
      req.params.taskId,
      req.body.status
    );
    res
      .status(200)
      .json({
        success: true,
        message: "Cập nhật trạng thái thành công",
        data: task,
      });
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

    const rawTasks = await taskService.getUserTasksByCampaign(
      userId,
      campaignId
    );
    res.json(rawTasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const submitTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { content } = req.body;
    const images = req.files?.map((file) => file.path) || [];
    const userId = req.decoded_authorization.user_id;

    const updatedTask = await taskService.submitTaskService(
      taskId,
      userId,
      content,
      images
    );

    res.status(200).json({
      message: "Submission nộp thành công",
      task: updatedTask,
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

export const reviewPeerTask = async (req, res, next) => {
  try {
    const { taskId, revieweeId } = req.params;
    const { score, comment } = req.body;
    const reviewerId = req.decoded_authorization.user_id;

    const task = await taskService.reviewPeerTaskService(
      taskId,
      reviewerId,
      revieweeId,
      score,
      comment
    );

    res.status(200).json({ message: "Peer review thành công", task });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

export const reviewTask = async (req, res, next) => {
  try {
    const { taskId, userId } = req.params;
    const { finalScore, overallComment } = req.body;
    const staffId = req.decoded_authorization.user_id;

    const updatedTask = await taskService.staffReviewTaskService(
      taskId,
      staffId,
      finalScore,
      overallComment
    );

    res.status(200).json({ message: "Đánh giá thành công", task: updatedTask });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

export const assignTaskToUser = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { userIds } = req.body;

    const updatedTask = await taskService.assignTaskToUsers(
      taskId,
      Array.isArray(userIds) ? userIds : [userIds]
    );

    return res.status(200).json({
      message: "Task assigned to users successfully",
      task: updatedTask,
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const getTasksByCampaign = async (req, res, next) => {
  try {
    const { campaignId } = req.params;
    const userId = req.decoded_authorization.user_id;

    const { campaign, phases } = await taskService.getTasksByCampaignService(
      campaignId,
      userId
    );

    res.status(200).json({
      success: true,
      message: "Lấy danh sách task thành công",
      data: { campaign, phases },
    });
  } catch (error) {
    next(error);
  }
};

export const getTasksByVolunteer = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { year, month } = req.query;

    if (!year || !month) {
      throw new Error("Year and month query parameters are required");
    }

    const tasks = await taskService.getTasksByVolunteerAndMonth(
      userId,
      parseInt(year),
      parseInt(month)
    );
    res.status(200).json({
      success: true,
      message: "Lấy danh sách task theo tháng thành công",
      data: tasks,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export async function getCampaignByTaskIdCtrl(req, res) {
  try {
    const { taskId } = req.params;
    const campaignId = await taskService.getCampaignIdByTaskId(taskId);
    if (!campaignId) return res.status(404).json({ message: "Not found" });
    return res.json({ campaignId });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}