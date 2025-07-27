import Task from '../models/task.model.js';
import PhaseDay from '../models/phaseDay.model.js';
import mongoose from 'mongoose';

export const createTask = async (phaseDayId, data) => {
    if (!mongoose.Types.ObjectId.isValid(phaseDayId)) {
        throw new Error('ID phaseDay không hợp lệ');
    }

    const phaseDay = await PhaseDay.findById(phaseDayId);
    if (!phaseDay) throw new Error('Không tìm thấy phaseDay');

    const task = await Task.create({
        phaseDayId,
        title: data.title,
        description: data.description,
        status: data.status,
        assignedUsers: data.assignedUsers || []
    });

    phaseDay.tasks.push(task._id);
    await phaseDay.save(); 

    return task;
};

export const updateTask = async (taskId, data) => {
    const task = await Task.findById(taskId);
    if (!task) throw new Error('Không tìm thấy task');

    if (data.title) task.title = data.title;
    if (data.description) task.description = data.description;
    if (data.status) task.status = data.status;
    if (data.assignedUsers) task.assignedUsers = data.assignedUsers;

    await task.save();
    return task;
};

export const deleteTask = async (taskId) => {
    const task = await Task.findById(taskId);
    if (!task) throw new Error('Không tìm thấy task');

    await PhaseDay.findByIdAndUpdate(task.phaseDayId, {
        $pull: { tasks: task._id }
    });

    await task.deleteOne();
    return { message: 'Xoá task thành công' };
};
