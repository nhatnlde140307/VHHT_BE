import * as taskService from '../services/task.service.js';

export const createTask = async (req, res, next) => {
    try {
        const task = await taskService.createTask(req.params.phaseDayId, req.body);
        res.status(201).json({ success: true, message: 'Tạo task thành công', data: task });
    } catch (err) {
        next(err);
    }
};

export const updateTask = async (req, res, next) => {
    try {
        const task = await taskService.updateTask(req.params.taskId, req.body);
        res.status(200).json({ success: true, message: 'Cập nhật task thành công', data: task });
    } catch (err) {
        next(err);
    }
};

export const deleteTask = async (req, res, next) => {
    try {
        const result = await taskService.deleteTask(req.params.taskId);
        res.status(200).json({ success: true, message: result.message });
    } catch (err) {
        next(err);
    }
};