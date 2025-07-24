import * as ReliefPointService from '../services/reliefPoint.service.js';
import { broadcastNewReliefPoint } from '../socket/socket.js';


export const createReliefPoint = async (req, res) => {
  try {
    const point = await ReliefPointService.createReliefPoint(req.body, req.user?._id);
    broadcastNewReliefPoint(point); 
    res.status(201).json(point);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const getReliefPoints = async (req, res) => {
  const { stormId, type, verified, status } = req.query;
  console.log(stormId)
  const points = await ReliefPointService.getReliefPoints({ stormId, type, verified, status });
  res.json(points);
};

export const getReliefPointById = async (req, res) => {
  const point = await ReliefPointService.getReliefPointById(req.params.id);
  res.json(point);
};

export const verifyReliefPoint = async (req, res) => {
  const result = await ReliefPointService.verifyReliefPoint(req.params.id, req.user?._id);
  res.json(result);
};

export const updateReliefPointStatus = async (req, res) => {
  const result = await ReliefPointService.updateStatus(req.params.id, req.body.status);
  res.json(result);
};

export const respondToReliefPoint = async (req, res) => {
  const result = await ReliefPointService.respondToReliefPoint(req.params.id, req.user?._id, req.body.note);
  res.json(result);
};
