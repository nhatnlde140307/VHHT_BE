import express from 'express';
import { createIssue, getIssues, getIssueById, updateIssue, deleteIssue } from '../controllers/issue.controller.js';
import { accessTokenValidator } from '../middlewares/users.middlewares.js';
const router = express.Router();

// Áp dụng auth cho tất cả routes
router.use(accessTokenValidator);

// Tạo issue mới
router.post('/', createIssue);

// Lấy danh sách issues (có thể filter)
router.get('/', getIssues);

// Lấy chi tiết issue
router.get('/:id', getIssueById);

// Update issue
router.put('/:id', updateIssue);

// Xóa issue
router.delete('/:id', deleteIssue);

export default router;