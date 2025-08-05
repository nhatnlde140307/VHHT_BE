import Issue from "../models/issue.model.js";
import Campaign from "../models/campaign.model.js";
import Task from "../models/task.model.js";
import User from "../models/users.model.js";
import Notification from "../models/notification.model.js";
import { sendNotificationToUser } from "../socket/socket.js";

class IssueService {
  async createIssue(issueData) {
    const { type, relatedEntity, ...rest } = issueData;

    // Validate relatedEntity based on type
    if (type === "task_issue" && relatedEntity.type !== "Task") {
      throw new Error("For task_issue, relatedEntity must be Task");
    }
    if (type === "campaign_withdrawal" && relatedEntity.type !== "Campaign") {
      throw new Error(
        "For campaign_withdrawal, relatedEntity must be Campaign"
      );
    }

    // Check if user is part of the entity
    if (type === "campaign_withdrawal") {
      const campaign = await Campaign.findById(relatedEntity.entityId);
      if (
        !campaign.volunteers.some(
          (v) => v.user.toString() === issueData.reportedBy.toString()
        )
      ) {
        throw new Error("User not joined this campaign");
      }
    } else if (type === "task_issue") {
      const task = await Task.findById(relatedEntity.entityId);
      if (
        !task.assignedUsers.some(
          (u) => u.userId.toString() === issueData.reportedBy.toString()
        )
      ) {
        throw new Error("User not assigned to this task");
      }
    }

    const newIssue = new Issue({ ...rest, type, relatedEntity });
    await newIssue.save();

    // Handle specific logic
    if (type === "campaign_withdrawal") {
      // Auto set status to 'open' (Manager sẽ approve)
      newIssue.status = "open";
      await newIssue.save();

      // Notify manager/organization
      const campaign = await Campaign.findById(relatedEntity.entityId).populate(
        "createdBy"
      );
      const managerId = campaign.createdBy._id;
      const notification = new Notification({
        title: "Yêu cầu rút lui khỏi chiến dịch",
        content: `User ${issueData.reportedBy} muốn rút lui khỏi campaign ${campaign.name}`,
        type: "campaign_withdrawal",
        recipient: managerId,
        link: `/issues/${newIssue._id}`,
      });
      await notification.save();
      sendNotificationToUser(managerId, notification);
    } else if (type === "task_issue") {
      const task = await Task.findById(relatedEntity.entityId);
    }

    // Push issue to relatedEntity's issues array (if added in model)
    if (relatedEntity.type === "Campaign") {
      await Campaign.findByIdAndUpdate(relatedEntity.entityId, {
        $push: { issues: newIssue._id },
      });
    } else if (relatedEntity.type === "Task") {
      await Task.findByIdAndUpdate(relatedEntity.entityId, {
        $push: { issues: newIssue._id },
      });
    }

    return newIssue.populate("reportedBy");
  }

  async getIssues(filters, user) {
    // user giờ là { _id }
    const query = {};
    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;

    return await Issue.find(query).populate("reportedBy");
  }

  async getIssueById(id) {
    return await Issue.findById(id).populate("reportedBy");
  }

  async updateIssue(id, updateData, user) {
    // user là { _id }
    const issue = await Issue.findById(id);
    if (!issue) throw new Error("Issue not found");

    Object.assign(issue, updateData);
    if (updateData.status === "closed") {
      if (issue.type === "campaign_withdrawal") {
        // Handle withdrawal: Remove user from campaign
        const campaign = await Campaign.findById(issue.relatedEntity.entityId);

        campaign.volunteers = campaign.volunteers.filter(
          (v) => v.user.toString() !== issue.reportedBy.toString()
        );
        await campaign.save();

        await User.findByIdAndUpdate(
          issue.reportedBy,
          {
            $pull: { joinedCampaigns: issue.relatedEntity.entityId },
          },
          { new: true }
        );

        // Update user joinedCampaigns
        await User.findByIdAndUpdate(issue.reportedBy, {
          $pull: { joinedCampaigns: issue.relatedEntity.entityId },
        });

        // Notify user
        const notification = new Notification({
          title: "Yêu cầu rút lui được chấp thuận",
          content: `Bạn đã rút lui khỏi campaign thành công`,
          type: "campaign_withdrawal",
          recipient: issue.reportedBy,
          link: `/campaigns/${issue.relatedEntity.entityId}`,
        });
        await notification.save();
        sendNotificationToUser(issue.reportedBy, notification);
      } else if (issue.type === "task_issue") {
        // Optional: Update task status or review
      }
    }

    await issue.save();
    return issue.populate("reportedBy");
  }

  async deleteIssue(id, user) {
    // user là { _id }
    const issue = await Issue.findById(id);
    if (!issue) throw new Error("Issue not found");

    // Loại bỏ check role, chỉ check nếu reportedBy
    if (issue.reportedBy.toString() !== user._id.toString()) {
      throw new Error("Unauthorized");
    }

    // Remove from relatedEntity
    if (issue.relatedEntity.type === "Campaign") {
      await Campaign.findByIdAndUpdate(issue.relatedEntity.entityId, {
        $pull: { issues: id },
      });
    } else if (issue.relatedEntity.type === "Task") {
      await Task.findByIdAndUpdate(issue.relatedEntity.entityId, {
        $pull: { issues: id },
      });
    }

    await Issue.deleteOne({ _id: id });
  }
}

export default new IssueService();
