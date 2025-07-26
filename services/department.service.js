import mongoose from "mongoose";
import Department from "../models/departments.model.js";
import Campaign from "../models/campaign.model.js";

export const departmentService = {
  async getDepartmentsByCampaignId(campaignId) {
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      throw new Error("ID chiến dịch không hợp lệ");
    }
    return await Department.find({ campaignId });
  },

  async getDepartmentByVolunteer(volunteerId, campaignId) {
    if (!mongoose.Types.ObjectId.isValid(volunteerId)) {
      throw new Error("ID tình nguyện viên không hợp lệ");
    }

    if (campaignId && !mongoose.Types.ObjectId.isValid(campaignId)) {
      throw new Error("ID chiến dịch không hợp lệ");
    }

    const query = {
      memberIds: { $in: [volunteerId] },
    };

    if (campaignId) {
      query.campaignId = campaignId;
    }

    const departments = await Department.find(query);

    return departments;
  },

  async createDepartment({
    campaignId,
    name,
    description = "",
    maxMembers = 0,
  }) {
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      throw new Error("ID chiến dịch không hợp lệ");
    }

    const department = new Department({
      campaignId,
      name,
      description,
      maxMembers,
      memberIds: [],
    });

    await department.save();
    return department;
  },

  async updateDepartment(departmentId, updates) {
    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      throw new Error("ID phòng ban không hợp lệ");
    }

    const department = await Department.findById(departmentId);
    if (!department) {
      throw new Error("Không tìm thấy phòng ban");
    }

    const updatableFields = ["name", "description", "maxMembers"];
    updatableFields.forEach((field) => {
      if (updates[field] !== undefined) {
        department[field] = updates[field];
      }
    });

    await department.save();
    return department;
  },

  async deleteDepartment(departmentId) {
    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      throw new Error("ID phòng ban không hợp lệ");
    }

    const department = await Department.findById(departmentId);
    if (!department) {
      throw new Error("Không tìm thấy phòng ban");
    }

    await department.deleteOne();
  },

  async addMember(departmentId, userId) {
    console.log("🧠 Đang kết nối tới DB:", mongoose.connection.name);

    console.log("📥 Thêm member:", userId, "vào phòng ban:", departmentId);
    if (
      !mongoose.Types.ObjectId.isValid(departmentId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      throw new Error("ID không hợp lệ");
    }

    const department = await Department.findById(departmentId);

    if (!department) throw new Error("Không tìm thấy phòng ban");

    if (department.memberIds.includes(userId)) {
      throw new Error("Thành viên đã tồn tại trong phòng ban");
    }

    if (
      department.maxMembers > 0 &&
      department.memberIds.length >= department.maxMembers
    ) {
      throw new Error("Phòng ban đã đạt giới hạn số lượng thành viên");
    }

    department.memberIds.push(userId);
    await department.save();
    return department;
  },

  async removeMember(departmentId, userId) {
    if (
      !mongoose.Types.ObjectId.isValid(departmentId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      throw new Error("ID không hợp lệ");
    }

    const department = await Department.findById(departmentId);
    if (!department) throw new Error("Không tìm thấy phòng ban");

    department.memberIds = department.memberIds.filter(
      (id) => id.toString() !== userId
    );

    await department.save();
    return department;
  },
};
