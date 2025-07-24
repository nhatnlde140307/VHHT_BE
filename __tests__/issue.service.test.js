import IssueService from '../services/issue.service.js';
import Issue from '../models/issue.model.js';
import Campaign from '../models/campaign.model.js';
import Task from '../models/task.model.js';
import User from '../models/users.model.js';
import Notification from '../models/notification.model.js';
import { sendNotificationToUser } from '../socket.js';

// Mock các dependencies
jest.mock('../models/issue.model.js');
jest.mock('../models/campaign.model.js');
jest.mock('../models/task.model.js');
jest.mock('../models/users.model.js');
jest.mock('../models/notification.model.js');
jest.mock('../socket.js');

describe('IssueService', () => {
  let issueService;

  beforeEach(() => {
    issueService = IssueService;
    jest.clearAllMocks();
  });

  describe('createIssue', () => {
    it('should create a task_issue successfully', async () => {
      const issueData = {
        title: 'Test Title',
        description: 'Test Desc',
        reportedBy: 'userId123',
        type: 'task_issue',
        relatedEntity: { type: 'Task', entityId: 'taskId123' }
      };

      Task.findById.mockResolvedValue({
        assignedUsers: [{ userId: 'userId123', review: { reviewedBy: 'reviewerId' } }]
      });

      const mockIssue = {
        ...issueData,
        _id: 'issueId',
        save: jest.fn().mockImplementation(async function () { return this; }),
        populate: jest.fn().mockImplementation(async function () { return this; })
      };
      Issue.mockImplementation(() => mockIssue);

      const mockNotification = { save: jest.fn().mockImplementation(async function () { return this; }) };
      Notification.mockImplementation(() => mockNotification);

      const result = await issueService.createIssue(issueData);

      expect(Task.findById).toHaveBeenCalledWith('taskId123');
      expect(Issue).toHaveBeenCalledWith(expect.objectContaining(issueData));
      expect(mockIssue.save).toHaveBeenCalled();
      expect(Notification).toHaveBeenCalled();
      expect(sendNotificationToUser).toHaveBeenCalled();
      expect(Task.findByIdAndUpdate).toHaveBeenCalledWith('taskId123', { $push: { issues: 'issueId' } });
      expect(result).toBe(mockIssue);
    });

    it('should create a campaign_withdrawal successfully', async () => {
      const issueData = {
        title: 'Withdrawal Request',
        description: 'Want to withdraw',
        reportedBy: 'userId123',
        type: 'campaign_withdrawal',
        relatedEntity: { type: 'Campaign', entityId: 'campaignId123' }
      };

      const mockCampaign = {
        volunteers: [{ user: 'userId123' }],
        name: 'Test Campaign',
        createdBy: { _id: 'managerId' }
      };
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((resolve) => resolve(mockCampaign))
      };
      Campaign.findById.mockReturnValue(mockQuery);

      const mockIssue = {
        ...issueData,
        _id: 'issueId',
        status: 'open',
        save: jest.fn().mockImplementation(async function () { return this; }),
        populate: jest.fn().mockImplementation(async function () { return this; })
      };
      Issue.mockImplementation(() => mockIssue);

      const mockNotification = { save: jest.fn().mockImplementation(async function () { return this; }) };
      Notification.mockImplementation(() => mockNotification);

      const result = await issueService.createIssue(issueData);

      expect(Campaign.findById).toHaveBeenCalledWith('campaignId123');
      expect(Issue).toHaveBeenCalledWith(expect.objectContaining(issueData));
      expect(mockIssue.save).toHaveBeenCalledTimes(2);
      expect(Notification).toHaveBeenCalled();
      expect(sendNotificationToUser).toHaveBeenCalledWith('managerId', expect.any(Object));
      expect(Campaign.findByIdAndUpdate).toHaveBeenCalledWith('campaignId123', { $push: { issues: 'issueId' } });
      expect(result).toBe(mockIssue);
    });

    it('should throw error if user not assigned to task for task_issue', async () => {
      const issueData = {
        type: 'task_issue',
        relatedEntity: { type: 'Task', entityId: 'taskId123' },
        reportedBy: 'userId123'
      };

      Task.findById.mockResolvedValue({ assignedUsers: [] });

      await expect(issueService.createIssue(issueData)).rejects.toThrow('User not assigned to this task');
    });

    it('should throw error if user not joined campaign for campaign_withdrawal', async () => {
      const issueData = {
        type: 'campaign_withdrawal',
        relatedEntity: { type: 'Campaign', entityId: 'campaignId123' },
        reportedBy: 'userId123'
      };

      Campaign.findById.mockResolvedValue({ volunteers: [] });

      await expect(issueService.createIssue(issueData)).rejects.toThrow('User not joined this campaign');
    });
  });

  describe('getIssues', () => {
    it('should get issues with filters', async () => {
      const filters = { type: 'task_issue' };
      const user = { _id: 'userId123' };  // Chỉ dùng _id
      const mockIssues = [{ _id: '1' }];

      const mockPopulate = { populate: jest.fn().mockResolvedValue(mockIssues) };
      Issue.find.mockReturnValue(mockPopulate);

      const result = await issueService.getIssues(filters, user);

      expect(Issue.find).toHaveBeenCalledWith({ type: 'task_issue' });  // Sửa: Không filter reportedBy vì middleware check role, tránh leak giả sử route được bảo vệ
      expect(result).toEqual(mockIssues);
    });
  });

  describe('getIssueById', () => {
    it('should get issue by id', async () => {
      const mockIssue = { _id: 'issueId' };
      const mockPopulate = { populate: jest.fn().mockResolvedValue(mockIssue) };
      Issue.findById.mockReturnValue(mockPopulate);

      const result = await issueService.getIssueById('issueId');

      expect(Issue.findById).toHaveBeenCalledWith('issueId');
      expect(result).toEqual(mockIssue);
    });
  });

  describe('updateIssue', () => {
    it('should update issue and handle campaign_withdrawal resolution', async () => {
      const issueId = 'issueId';
      const updateData = { status: 'resolved' };
      const user = { _id: 'managerId' };  // Chỉ dùng _id
      const mockIssue = {
        _id: issueId,
        type: 'campaign_withdrawal',
        relatedEntity: { type: 'Campaign', entityId: 'campaignId' },
        reportedBy: 'userId123',
        assignedTo: 'managerId',
        save: jest.fn().mockImplementation(async function () { return this; }),
        populate: jest.fn().mockImplementation(async function () { return this; })
      };
      Issue.findById.mockResolvedValue(mockIssue);

      const mockCampaign = {
        volunteers: [{ user: 'userId123' }],
        save: jest.fn().mockImplementation(async function () { return this; })
      };
      Campaign.findById.mockResolvedValue(mockCampaign);

      User.findByIdAndUpdate.mockResolvedValue({});

      const mockNotification = { save: jest.fn().mockImplementation(async function () { return this; }) };
      Notification.mockImplementation(() => mockNotification);

      const result = await issueService.updateIssue(issueId, updateData, user);

      expect(Issue.findById).toHaveBeenCalledWith(issueId);
      expect(mockIssue.save).toHaveBeenCalled();
      expect(Campaign.findById).toHaveBeenCalledWith('campaignId');
      expect(mockCampaign.save).toHaveBeenCalled();
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith('userId123', { $pull: { joinedCampaigns: 'campaignId' } });
      expect(Notification).toHaveBeenCalled();
      expect(sendNotificationToUser).toHaveBeenCalled();
      expect(result).toBe(mockIssue);
    });

    it('should throw unauthorized error if not allowed to update', async () => {
      const mockIssue = { assignedTo: 'otherId' };
      Issue.findById.mockResolvedValue(mockIssue);
      const user = { _id: 'userId' };

      await expect(issueService.updateIssue('id', {}, user)).rejects.toThrow('Unauthorized');
    });
  });

  describe('deleteIssue', () => {
    it('should delete issue if authorized', async () => {
      const issueId = 'issueId';
      const user = { _id: 'userId' };
      const mockIssue = {
        _id: issueId,
        relatedEntity: { type: 'Task', entityId: 'taskId' },
        reportedBy: 'userId'
      };
      Issue.findById.mockResolvedValue(mockIssue);
      Issue.deleteOne.mockResolvedValue({});

      await issueService.deleteIssue(issueId, user);

      expect(Issue.findById).toHaveBeenCalledWith(issueId);
      expect(Task.findByIdAndUpdate).toHaveBeenCalledWith('taskId', { $pull: { issues: issueId } });
      expect(Issue.deleteOne).toHaveBeenCalledWith({ _id: issueId });
    });

    it('should throw unauthorized error if not allowed', async () => {
      const mockIssue = { reportedBy: 'otherId' };
      Issue.findById.mockResolvedValue(mockIssue);
      const user = { _id: 'userId' };

      await expect(issueService.deleteIssue('id', user)).rejects.toThrow('Unauthorized');
    });
  });
});