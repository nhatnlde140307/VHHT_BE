import mongoose from 'mongoose';
import Storm from '../models/storm.model.js';
import {
  createStorm,
  activateStorm,
  deactivateStorm,
  getActiveStorm,
  getAllStorms
} from '../services/storm.service.js';

jest.mock('../models/storm.model.js');

describe('Storm Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createStorm', () => {
    it('should deactivate old storms if isActive is true and create new storm', async () => {
      const data = { name: 'Storm X', isActive: true };

      Storm.updateMany.mockResolvedValue({ acknowledged: true });
      Storm.create.mockResolvedValue({ _id: 'new-id', ...data });

      const result = await createStorm(data);

      expect(Storm.updateMany).toHaveBeenCalledWith(
        { isActive: true },
        { isActive: false }
      );
      expect(Storm.create).toHaveBeenCalledWith(data);
      expect(result).toEqual({ _id: 'new-id', ...data });
    });

    it('should skip updateMany if isActive is false', async () => {
      const data = { name: 'Storm Y', isActive: false };

      Storm.create.mockResolvedValue({ _id: 'new-id', ...data });

      const result = await createStorm(data);

      expect(Storm.updateMany).not.toHaveBeenCalled();
      expect(Storm.create).toHaveBeenCalledWith(data);
      expect(result).toEqual({ _id: 'new-id', ...data });
    });
  });

  describe('activateStorm', () => {
    it('should throw error if id is invalid', async () => {
      await expect(activateStorm('invalid-id')).rejects.toThrow('Invalid storm ID');
    });

    it('should deactivate old storms and activate given one', async () => {
      const id = new mongoose.Types.ObjectId().toString();
      const updatedStorm = { _id: id, isActive: true, status: 'active' };

      Storm.updateMany.mockResolvedValue({});
      Storm.findByIdAndUpdate.mockResolvedValue(updatedStorm);

      const result = await activateStorm(id);

      expect(Storm.updateMany).toHaveBeenCalledWith(
        { isActive: true },
        { isActive: false }
      );
      expect(Storm.findByIdAndUpdate).toHaveBeenCalledWith(
        id,
        { isActive: true, status: 'active' },
        { new: true }
      );
      expect(result).toEqual(updatedStorm);
    });
  });

  describe('deactivateStorm', () => {
    it('should throw error if id is invalid', async () => {
      await expect(deactivateStorm('invalid-id')).rejects.toThrow('Invalid storm ID');
    });

    it('should deactivate storm and return updated doc', async () => {
      const id = new mongoose.Types.ObjectId().toString();
      const updatedStorm = { _id: id, isActive: false, status: 'ended' };

      Storm.findByIdAndUpdate.mockResolvedValue(updatedStorm);

      const result = await deactivateStorm(id);

      expect(Storm.findByIdAndUpdate).toHaveBeenCalledWith(
        id,
        { isActive: false, status: 'ended' },
        { new: true }
      );
      expect(result).toEqual(updatedStorm);
    });
  });

  describe('getActiveStorm', () => {
    it('should return the currently active storm', async () => {
      const activeStorm = { _id: 'storm123', isActive: true };

      Storm.findOne.mockResolvedValue(activeStorm);

      const result = await getActiveStorm();

      expect(Storm.findOne).toHaveBeenCalledWith({ isActive: true });
      expect(result).toEqual(activeStorm);
    });
  });

  describe('getAllStorms', () => {
    it('should return all storms sorted by createdAt', async () => {
      const storms = [{ name: 'A' }, { name: 'B' }];

      Storm.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(storms)
      });

      const result = await getAllStorms();

      expect(Storm.find).toHaveBeenCalled();
      expect(result).toEqual(storms);
    });
  });
});