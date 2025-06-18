import * as NotificationService from '../services/notification.service.js';
import { getIO } from '../socket/socket.js';

export const getMyNotifications = async (req, res) => {
  try {
    const userId = req.decoded_authorization.user_id;
    const notifications = await NotificationService.getNotificationsByUser(userId);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const userId = req.decoded_authorization.user_id;
    const id = req.params.id;
    await NotificationService.markNotificationAsRead(id, userId);
    res.sendStatus(200);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const sendTestNotification = (req, res) => {
  const io = getIO();

  io.to('test-user-123').emit('notification', {
    title: 'Thông báo thử',
    content: 'Đây là thông báo test realtime từ server. 4!'
  });

  res.status(200).json({ message: 'Notification sent via socket' });
};