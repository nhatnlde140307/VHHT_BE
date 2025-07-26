import express from 'express';
import * as ReliefPointController from '../controllers/reliefPoint.controller.js';

const rlPointrouter = express.Router();

// Tạo mới
rlPointrouter.post('/', ReliefPointController.createReliefPoint);

// Lấy danh sách
rlPointrouter.get('/', ReliefPointController.getReliefPoints);

// Lấy chi tiết
rlPointrouter.get('/:id', ReliefPointController.getReliefPointById);

// Xác minh điểm
rlPointrouter.patch('/:id/verify', ReliefPointController.verifyReliefPoint);

// Cập nhật trạng thái
rlPointrouter.patch('/:id/status', ReliefPointController.updateReliefPointStatus);

// Đăng ký hỗ trợ
rlPointrouter.patch('/:id/respond', ReliefPointController.respondToReliefPoint);

// Thêm route xóa điểm
rlPointrouter.delete('/:id', ReliefPointController.deleteReliefPoint);

export default rlPointrouter;
