import { departmentService } from "../services/department.service.js";
import Campaign from "../models/campaign.model.js";

export const getDepartmentsByCampaignId = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const departments = await departmentService.getDepartmentsByCampaignId(
      campaignId
    );
    res.status(200).json(departments);
  } catch (error) {
    console.error("❌ Lỗi khi lấy danh sách phòng ban:", error);
    res.status(400).json({ error: { message: err.message } });
  }
};

export const getDepartmentByVolunteer = async (req, res) => {
  try {
    const { volunteerId } = req.params;
    const { campaignId } = req.params;
    const departments = await departmentService.getDepartmentByVolunteer(
      volunteerId,
      campaignId
    );
    res.status(200).json({
      success: true,
      message: "Lấy danh sách phòng ban theo tình nguyện viên thành công",
      data: departments,
    });
  } catch (error) {
    console.error(
      "❌ Lỗi khi lấy danh sách phòng ban theo tình nguyện viên:",
      error
    );
    res.status(400).json({
      success: false,
      message: "Lấy danh sách phòng ban thất bại",
      error: error.message,
    });
  }
};

export const createDepartment = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { name, description, maxMembers } = req.body;

    const department = await departmentService.createDepartment({
      campaignId,
      name,
      description,
      maxMembers,
    });

    await Campaign.findByIdAndUpdate(campaignId, {
      $addToSet: { departments: department._id },
    });

    return res.status(201).json({
      success: true,
      message: "Tạo phòng ban thành công",
      data: department,
    });
  } catch (error) {
    console.error("❌ Lỗi khi tạo phòng ban:", error);
    return res.status(500).json({
      success: false,
      message: "Tạo phòng ban thất bại",
      error: error.message,
    });
  }
};

export const updateDepartment = async (req, res) => {
  const { departmentId } = req.params;
  const updates = req.body;

  const department = await departmentService.updateDepartment(
    departmentId,
    updates
  );

  res.status(200).json({
    success: true,
    message: "Cập nhật phòng ban thành công",
    data: department,
  });
};

export const deleteDepartment = async (req, res) => {
  const { departmentId } = req.params;

  await departmentService.deleteDepartment(departmentId);

  res.status(200).json({
    success: true,
    message: "Xoá phòng ban thành công",
  });
};

export const addMemberToDepartment = async (req, res) => {
  const { departmentId, userId } = req.params;

  const department = await departmentService.addMember(departmentId, userId);

  res.status(200).json({
    success: true,
    message: "Đã thêm thành viên vào phòng ban",
    data: department,
  });
};

export const removeMemberFromDepartment = async (req, res) => {
  const { departmentId, userId } = req.params;

  const department = await departmentService.removeMember(departmentId, userId);

  res.status(200).json({
    success: true,
    message: "Đã xoá thành viên khỏi phòng ban",
    data: department,
  });
};
