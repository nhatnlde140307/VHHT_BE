import ReliefPoint from '../models/reliefPoint.model.js';
import mongoose from 'mongoose';

export const createReliefPoint = async (data, userId) => {
  const point = new ReliefPoint({
    ...data,
    createdBy: userId,
    verified: false,
    status: 'pending',
  });
  return await point.save();
};

export const getReliefPoints = async (filters) => {
  const query = {};

  if (filters.stormId) query.stormId = filters.stormId;
  if (filters.type) query.type = filters.type;
  if (filters.verified !== undefined) query.verified = filters.verified;
  if (filters.status) query.status = filters.status;

  return await ReliefPoint.find(query).sort({ createdAt: -1 });
};

export const getReliefPointById = async (id) => {
  return await ReliefPoint.findById(id);
};

export const verifyReliefPoint = async (id, staffId) => {
  return await ReliefPoint.findByIdAndUpdate(
    id,
    { verified: true, verifiedBy: staffId },
    { new: true }
  );
};

export const updateStatus = async (id, status) => {
  return await ReliefPoint.findByIdAndUpdate(id, { status }, { new: true });
};

export const respondToReliefPoint = async (id, userId, note) => {
  return await ReliefPoint.findByIdAndUpdate(
    id,
    {
      $push: {
        responders: { userId, note, joinedAt: new Date() },
      },
    },
    { new: true }
  );
};
