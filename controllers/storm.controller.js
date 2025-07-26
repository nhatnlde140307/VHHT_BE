import * as StormService from '../services/storm.service.js';
import { getIO } from '../socket/socket.js';

export const createStorm = async (req, res) => {
  try {
    const storm = await StormService.createStorm(req.body);

    if (storm.isActive) {
      getIO().emit("storm-activated", storm);
    }

    res.status(201).json(storm);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const activateStorm = async (req, res) => {
  try {
    const storm = await StormService.activateStorm(req.params.id);
    getIO().emit('storm-activated', storm); // 🎯 Gửi đến toàn bộ user
    res.json(storm);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const deactivateStorm = async (req, res) => {
  try {
    const storm = await StormService.deactivateStorm(req.params.id);
    getIO().emit('storm-deactivated', storm._id); // 🎯 Gửi event huỷ
    res.json(storm);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const getActiveStorm = async (req, res) => {
  try {
    const storm = await StormService.getActiveStorm();
    res.json(storm);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getAllStorms = async (req, res) => {
  try {
    const storms = await StormService.getAllStorms();
    res.json(storms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
