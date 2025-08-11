import * as reliefPointService from '../services/reliefPoint.service.js';
import ReliefPoint from '../models/reliefPoint.model.js';

jest.mock('../models/reliefPoint.model.js');

describe('ReliefPoint Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createReliefPoint', () => {
    it('should create and return a new relief point', async () => {
      const mockData = { name: 'Point A', type: 'supply' };
      const mockResult = { ...mockData, _id: '123' };

      ReliefPoint.mockImplementation(() => ({
        ...mockData,
        save: jest.fn().mockResolvedValue(mockResult)
      }));

      const result = await reliefPointService.createReliefPoint(mockData, 'user1');

      expect(result).toEqual(mockResult);
      expect(ReliefPoint).toHaveBeenCalledWith(expect.objectContaining({
        ...mockData,
        createdBy: 'user1',
        verified: false,
        status: 'pending'
      }));
    });
  });

  describe('getReliefPoints', () => {
    it('should return filtered relief points', async () => {
      const filters = { type: 'need', verified: true };
      const mockList = [{ name: 'P1' }, { name: 'P2' }];

      ReliefPoint.find.mockReturnValue({ sort: jest.fn().mockResolvedValue(mockList) });

      const result = await reliefPointService.getReliefPoints(filters);

      expect(ReliefPoint.find).toHaveBeenCalledWith(expect.objectContaining({
        type: 'need',
        verified: true
      }));
      expect(result).toEqual(mockList);
    });
  });

  describe('getReliefPointById', () => {
    it('should return the relief point by id', async () => {
      const mockPoint = { _id: '123', name: 'Point A' };
      ReliefPoint.findById.mockResolvedValue(mockPoint);

      const result = await reliefPointService.getReliefPointById('123');

      expect(ReliefPoint.findById).toHaveBeenCalledWith('123');
      expect(result).toEqual(mockPoint);
    });
  });

  describe('verifyReliefPoint', () => {
    it('should verify the relief point and return updated', async () => {
      const updated = { _id: 'id1', verified: true };
      ReliefPoint.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await reliefPointService.verifyReliefPoint('id1', 'staff1');

      expect(ReliefPoint.findByIdAndUpdate).toHaveBeenCalledWith(
        'id1',
        { verified: true, verifiedBy: 'staff1' },
        { new: true }
      );
      expect(result).toEqual(updated);
    });
  });

  describe('updateStatus', () => {
    it('should update the status of a relief point', async () => {
      const updated = { _id: 'id2', status: 'resolved' };
      ReliefPoint.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await reliefPointService.updateStatus('id2', 'resolved');

      expect(ReliefPoint.findByIdAndUpdate).toHaveBeenCalledWith(
        'id2',
        { status: 'resolved' },
        { new: true }
      );
      expect(result).toEqual(updated);
    });
  });

  describe('respondToReliefPoint', () => {
    it('should add responder to relief point', async () => {
      const updated = { _id: 'id3', responders: [{ userId: 'u1', note: 'ready' }] };
      ReliefPoint.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await reliefPointService.respondToReliefPoint('id3', 'u1', 'ready');

      expect(ReliefPoint.findByIdAndUpdate).toHaveBeenCalledWith(
        'id3',
        expect.objectContaining({
          $push: {
            responders: expect.objectContaining({
              userId: 'u1',
              note: 'ready',
              joinedAt: expect.any(Date)
            })
          }
        }),
        { new: true }
      );
      expect(result).toEqual(updated);
    });
  });

  describe('deleteReliefPointById', () => {
    it('should delete and return relief point if exists', async () => {
      const point = { _id: 'id4', name: 'Deleted' };
      ReliefPoint.findByIdAndDelete.mockResolvedValue(point);

      const result = await reliefPointService.deleteReliefPointById('id4');

      expect(ReliefPoint.findByIdAndDelete).toHaveBeenCalledWith('id4');
      expect(result).toEqual(point);
    });

    it('should throw error if not found', async () => {
      ReliefPoint.findByIdAndDelete.mockResolvedValue(null);

      await expect(reliefPointService.deleteReliefPointById('id5'))
        .rejects
        .toThrow('Không tìm thấy điểm cứu trợ để xóa');
    });
  });
});