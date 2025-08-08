// __tests__/notification.service.test.js
import mongoose from 'mongoose';
import Notification from '../models/notification.model.js';
import * as notificationService from '../services/notification.service.js';

jest.mock('../models/notification.model.js');

describe('notificationService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create and return notification', async () => {
      const payload = {
        title: 'New Alert',
        content: 'You have a new message.',
        link: '/messages',
        type: 'info',
        recipient: 'user123'
      };

      const mockCreated = { ...payload, _id: 'noti123' };
      Notification.create.mockResolvedValue(mockCreated);

      const result = await notificationService.createNotification(payload);
      expect(Notification.create).toHaveBeenCalledWith(payload);
      expect(result).toEqual(mockCreated);
    });
  });

  describe('getNotificationsByUser', () => {
    it('should return sorted notifications by userId', async () => {
      const userId = 'user123';
      const mockQuery = {
        sort: jest.fn().mockResolvedValue([{ title: 'Test' }])
      };
      Notification.find.mockReturnValue(mockQuery);

      const result = await notificationService.getNotificationsByUser(userId);
      expect(Notification.find).toHaveBeenCalledWith({ recipient: userId });
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual([{ title: 'Test' }]);
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark notification as read and save', async () => {
      const id = 'notif123';
      const userId = 'user123';
      const mockNoti = {
        isRead: false,
        save: jest.fn().mockResolvedValue({ isRead: true })
      };
      Notification.findOne.mockResolvedValue(mockNoti);

      const result = await notificationService.markNotificationAsRead(id, userId);
      expect(Notification.findOne).toHaveBeenCalledWith({ _id: id, recipient: userId });
      expect(mockNoti.isRead).toBe(true);
      expect(mockNoti.save).toHaveBeenCalled();
      expect(result).toEqual({ isRead: true });
    });

    it('should throw error if notification not found or unauthorized', async () => {
      Notification.findOne.mockResolvedValue(null);

      await expect(
        notificationService.markNotificationAsRead('invalidId', 'user123')
      ).rejects.toThrow('Notification not found or not authorized');
    });
  });
});