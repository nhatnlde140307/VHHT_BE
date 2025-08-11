import mongoose from 'mongoose';
import * as checkinService from '../services/checkin.service.js';
import Checkin from '../models/checkin.model.js';

jest.mock('../models/checkin.model.js');

describe('CheckinService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

//   describe('createCheckin', () => {
//     it('should create a new checkin and save it', async () => {
//       const mockData = {
//         userId: new mongoose.Types.ObjectId(),
//         phaseDayId: new mongoose.Types.ObjectId(),
//         checkinTime: new Date(),
//       };

//       const mockSave = jest.fn().mockResolvedValue({ ...mockData, _id: 'checkinId' });
//       let constructorArgs;
//       Checkin.mockImplementation((data) => {
//         constructorArgs = data;
//         return { save: mockSave };
//       });

//       const result = await checkinService.createCheckin(mockData);

//       expect(constructorArgs).toBeDefined();
//       expect(constructorArgs.userId).toEqual(mockData.userId);
//       expect(constructorArgs.phaseDayId).toBeDefined();
//       expect(constructorArgs.phaseDayId?.toString()).toEqual(mockData.phaseDayId.toString());
//       expect(constructorArgs.checkinTime).toEqual(mockData.checkinTime);
//       expect(mockSave).toHaveBeenCalled();
//       expect(result).toEqual({ ...mockData, _id: 'checkinId' });
//     });
//   });

  describe('getCheckinStatusByPhaseday', () => {
    it('should return true if user has checked in', async () => {}, 10000);

    it('should return false if user has not checked in', async () => {}, 10000);
  });
});