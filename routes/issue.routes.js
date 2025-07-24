import express from 'express';
import { createIssue, getIssues, getIssueById, updateIssue, deleteIssue } from '../controllers/issue.controller.js';
import { accessTokenValidator } from '../middlewares/users.middlewares.js';
const issueRouter = express.Router();

// Áp dụng auth cho tất cả routes
issueRouter.use(accessTokenValidator);

// Tạo issue mới
issueRouter.post('/', createIssue);

// Lấy danh sách issues (có thể filter)
issueRouter.get('/', getIssues);

// Lấy chi tiết issue
issueRouter.get('/:id', getIssueById);

// Update issue
issueRouter.put('/:id', updateIssue);

// Xóa issue
issueRouter.delete('/:id', deleteIssue);

export default issueRouter;