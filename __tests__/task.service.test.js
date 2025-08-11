import mongoose from 'mongoose';
import * as taskService from '../services/task.service.js';
import Task from '../models/task.model.js';
import PhaseDay from '../models/phaseDay.model.js';
import Phase from '../models/phase.model.js';
import User from '../models/users.model.js';
import Campaign from '../models/campaign.model.js';
import Checkin from '../models/checkin.model.js';
import Notification from '../models/notification.model.js';
import { sendNotificationToUser } from '../socket/socket.js';

jest.mock('../models/task.model.js');
jest.mock('../models/phaseDay.model.js');
jest.mock('../models/phase.model.js');
jest.mock('../models/users.model.js');
jest.mock('../models/campaign.model.js');
jest.mock('../models/checkin.model.js');
jest.mock('../models/notification.model.js');
jest.mock('../socket/socket.js');

const task = {
  title: 'Old',
  save: jest.fn().mockResolvedValue(true)
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);
  task.title = 'Old'; // reset lại giá trị mỗi test
});

describe('taskService', () => {
  describe('getTasksByPhaseDayId', () => {
    it('should return tasks populated by phaseDayId', async () => {
      Task.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ _id: 'task1' }])
      });

      const result = await taskService.getTasksByPhaseDayId('id');
      expect(result).toEqual([{ _id: 'task1' }]);
    });
  });

  describe('createTask', () => {
    it('should create task and update phaseDay', async () => {
      const phaseDay = { _id: 'pd1', tasks: [], save: jest.fn() };
      PhaseDay.findById.mockResolvedValue(phaseDay);
      Task.create.mockResolvedValue({ _id: 'task1' });

      const result = await taskService.createTask('pd1', {
        title: 'T1',
        description: '',
        status: 'in_progress',
        leaderId: 'leader',
        assignedUsers: []
      });

      expect(result._id).toBe('task1');
      expect(phaseDay.save).toHaveBeenCalled();
    });
  });

  describe('updateTask', () => {
    it('should update and save task', async () => {
      Task.findById.mockResolvedValue(task);
      const data = { title: 'New' };
      await taskService.updateTask('task1', data);
      expect(task.title).toBe('New');
      expect(task.save).toHaveBeenCalled();
    });
  });

  describe('updateTaskStatusService', () => {
    it('should update task status', async () => {
      const taskStatus = { status: 'in_progress', save: jest.fn().mockResolvedValue(true) };
      Task.findById.mockResolvedValue(taskStatus);
      const result = await taskService.updateTaskStatusService('id', 'submitted');
      expect(result.status).toBe('submitted');
    });
  });

  describe('deleteTask', () => {
    it('should delete task and update phaseDay', async () => {
      const taskDel = { _id: 'task1', phaseDayId: 'pd1', deleteOne: jest.fn() };
      Task.findById.mockResolvedValue(taskDel);
      PhaseDay.findByIdAndUpdate.mockResolvedValue(true);

      const result = await taskService.deleteTask('task1');
      expect(result.message).toBe('Xoá task thành công');
    });
  });
});

// describe('submitTaskService', () => {
//   it('should set submission and status', async () => {
//     const mockTask = {
//       leaderId: new mongoose.Types.ObjectId('507f191e810c19729de860ea'),
//       submission: '',
//       status: 'in-progress',
//       save: jest.fn().mockResolvedValue(true)
//     };

//     Task.findById.mockResolvedValue(mockTask);

//     const result = await taskService.submitTaskService('taskId', 'https://file.com', new mongoose.Types.ObjectId('507f191e810c19729de860ea'));
//     expect(mockTask.submission).toBe('https://file.com');
//     expect(mockTask.status).toBe('submitted');
//     expect(mockTask.save).toHaveBeenCalled();
//     expect(result.message).toBe('Nộp task thành công');
//   });
// });

// reviewPeerTaskService
// getTasksByCampaignService
