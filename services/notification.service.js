import Notification from "../models/notification.model.js";

export const createNotification = async ({ title, content, link, type, recipient }) => {
  return await Notification.create({ title, content, link, type, recipient });
};

export const getNotificationsByUser = async (userId) => {
  return await Notification.find({ recipient: userId }).sort({ createdAt: -1 });
};

export const markNotificationAsRead = async (id, userId) => {
  const noti = await Notification.findOne({ _id: id, recipient: userId });
  if (!noti) throw new Error("Notification not found or not authorized");
  noti.isRead = true;
  return await noti.save();
};