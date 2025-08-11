import IssueService from '../services/issue.service.js';
import Issue from '../models/issue.model.js';
import Campaign from '../models/campaign.model.js';
import Task from '../models/task.model.js';
import User from '../models/users.model.js';
import Notification from '../models/notification.model.js';
import { sendNotificationToUser } from '../socket/socket.js';

jest.mock('../models/issue.model.js');
jest.mock('../models/campaign.model.js');
jest.mock('../models/task.model.js');
jest.mock('../models/users.model.js');
jest.mock('../models/notification.model.js');
jest.mock('../socket/socket.js');

describe('IssueService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createIssue', () => {
    it('should throw if relatedEntity.type mismatches', async () => {
      await expect(IssueService.createIssue({
        type: 'task_issue',
        relatedEntity: { type: 'Campaign', entityId: 'id' }
      })).rejects.toThrow('For task_issue, relatedEntity must be Task');
    });

    it('should create task_issue successfully', async () => {
      const issueData = {
        type: 'task_issue',
        relatedEntity: { type: 'Task', entityId: 'task123' },
        reportedBy: 'user123',
        title: 'Bug',
        description: 'Bug in task'
      };

      Task.findById.mockResolvedValue({
        assignedUsers: [{ userId: 'user123' }]
      });

      const populated = {
        ...issueData,
        _id: 'issueId'
      };

      const saved = {
        ...issueData,
        _id: 'issueId',
        save: jest.fn().mockResolvedValue(),
        populate: jest.fn().mockResolvedValue(populated)
      };
      Issue.mockImplementation(() => saved);

      const result = await IssueService.createIssue(issueData);

      expect(Task.findById).toHaveBeenCalled();
      expect(Issue).toHaveBeenCalled();
      expect(result).toEqual(populated);
    });

    it('should create campaign_withdrawal and send notification', async () => {
      const issueData = {
        type: 'campaign_withdrawal',
        relatedEntity: { type: 'Campaign', entityId: 'campId' },
        reportedBy: 'user123',
        title: 'Withdraw',
        description: 'Want to leave'
      };

      Campaign.findById.mockResolvedValueOnce({
        volunteers: [{ user: 'user123' }]
      });

      Campaign.findById.mockReturnValueOnce({
        populate: jest.fn().mockResolvedValue({
          name: 'Chiến dịch A',
          createdBy: { _id: 'manager123' }
        })
      });

      const populated = {
        ...issueData,
        _id: 'issueId',
        status: 'open'
      };

      const saved = {
        ...issueData,
        _id: 'issueId',
        save: jest.fn().mockResolvedValue(this),
        populate: jest.fn().mockResolvedValue(populated)
      };
      Issue.mockImplementation(() => saved);

      Notification.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(true)
      }));

      const result = await IssueService.createIssue(issueData);

      expect(Campaign.findById).toHaveBeenCalled();
      expect(sendNotificationToUser).toHaveBeenCalledWith('manager123', expect.any(Object));
      expect(result).toEqual(populated);
    });

    it('should throw if user not joined campaign', async () => {
      Campaign.findById.mockResolvedValue({ volunteers: [] });
      await expect(IssueService.createIssue({
        type: 'campaign_withdrawal',
        relatedEntity: { type: 'Campaign', entityId: 'campId' },
        reportedBy: 'user123'
      })).rejects.toThrow('User not joined this campaign');
    });

    it('should throw if user not assigned to task', async () => {
      Task.findById.mockResolvedValue({ assignedUsers: [] });
      await expect(IssueService.createIssue({
        type: 'task_issue',
        relatedEntity: { type: 'Task', entityId: 'taskId' },
        reportedBy: 'user123'
      })).rejects.toThrow('User not assigned to this task');
    });
  });

  describe('getIssues', () => {
    it('should return issues with filters', async () => {
      const mock = { populate: jest.fn().mockResolvedValue(['issue1']) };
      Issue.find.mockReturnValue(mock);

      const result = await IssueService.getIssues({ type: 'task_issue' }, { _id: 'userId' });
      expect(Issue.find).toHaveBeenCalledWith({ type: 'task_issue' });
      expect(result).toEqual(['issue1']);
    });
  });

  describe('getIssueById', () => {
    it('should return populated issue', async () => {
      const mock = { populate: jest.fn().mockResolvedValue({ id: 'x' }) };
      Issue.findById.mockReturnValue(mock);

      const result = await IssueService.getIssueById('id');
      expect(Issue.findById).toHaveBeenCalledWith('id');
      expect(result).toEqual({ id: 'x' });
    });
  });

  describe('updateIssue', () => {
    it('should update campaign_withdrawal and notify', async () => {
      const issue = {
        type: 'campaign_withdrawal',
        relatedEntity: { type: 'Campaign', entityId: 'campId' },
        reportedBy: 'userId123',
        save: jest.fn().mockResolvedValue()
      };
      const populated = {
        ...issue
      };
      issue.populate = jest.fn().mockResolvedValue(populated);

      const campaign = {
        volunteers: [{ user: 'userId123' }],
        save: jest.fn().mockResolvedValue(true)
      };
      Issue.findById.mockResolvedValue(issue);
      Campaign.findById.mockResolvedValue(campaign);
      User.findByIdAndUpdate.mockResolvedValue({});
      Notification.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(true)
      }));

      const result = await IssueService.updateIssue('id', { status: 'closed' }, { _id: 'managerId' });

      expect(Campaign.findById).toHaveBeenCalledWith('campId');
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith('userId123', {
        $pull: { joinedCampaigns: 'campId' }
      });
      expect(result).toEqual(populated);
    });

    it('should throw if issue not found', async () => {
      Issue.findById.mockResolvedValue(null);
      await expect(IssueService.updateIssue('notfound', {}, {})).rejects.toThrow('Issue not found');
    });
  });

  describe('deleteIssue', () => {
    it('should delete if authorized', async () => {
      const issue = {
        _id: 'issueId',
        relatedEntity: { type: 'Campaign', entityId: 'campId' },
        reportedBy: 'user123'
      };
      Issue.findById.mockResolvedValue(issue);
      Issue.deleteOne.mockResolvedValue({});
      await IssueService.deleteIssue('issueId', { _id: 'user123' });

      expect(Campaign.findByIdAndUpdate).toHaveBeenCalledWith('campId', {
        $pull: { issues: 'issueId' }
      });
      expect(Issue.deleteOne).toHaveBeenCalledWith({ _id: 'issueId' });
    });

    it('should throw if not the reporter', async () => {
      Issue.findById.mockResolvedValue({ reportedBy: 'other' });
      await expect(IssueService.deleteIssue('id', { _id: 'user123' })).rejects.toThrow('Unauthorized');
    });

    it('should throw if issue not found', async () => {
      Issue.findById.mockResolvedValue(null);
      await expect(IssueService.deleteIssue('id', { _id: 'user123' })).rejects.toThrow('Issue not found');
    });
  });
});