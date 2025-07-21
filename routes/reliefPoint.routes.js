import express from 'express';
import {
  getAllReliefPoints,
  createReliefPoint,
  getNearestReliefPoint,
  updateReliefPointStatus,
} from '../controllers/reliefPoint.controller.js';

const router = express.Router();

router.get('/', getAllReliefPoints);
router.post('/report', createReliefPoint);
router.get('/nearest', getNearestReliefPoint);
router.patch('/:id/status', updateReliefPointStatus);

export default router;
