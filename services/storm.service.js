import Storm from '../models/storm.model.js';
import mongoose from 'mongoose';

export const createStorm = async (data) => {
  if (data.isActive) {
    // Tự động tắt các storm cũ đang active
    await Storm.updateMany({ isActive: true }, { isActive: false });
  }

  return Storm.create(data);
};


export const activateStorm = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid storm ID");
  }

  // Hủy các bão đang active khác nếu cần
  await Storm.updateMany({ isActive: true }, { isActive: false });

  return Storm.findByIdAndUpdate(id, { isActive: true, status: 'active' }, { new: true });
};

export const deactivateStorm = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid storm ID");
  }

  return Storm.findByIdAndUpdate(id, { isActive: false, status: 'ended' }, { new: true });
};

export const getActiveStorm = () => {
  return Storm.findOne({ isActive: true });
};

export const getAllStorms = () => {
  return Storm.find().sort({ createdAt: -1 });
};
