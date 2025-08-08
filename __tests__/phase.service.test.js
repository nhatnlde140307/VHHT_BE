import { phaseService } from '../services/phase.service.js';
import mongoose from 'mongoose';
import Phase from '../models/phase.model.js';
import Campaign from '../models/campaign.model.js';
import PhaseDay from '../models/phaseDay.model.js';
import Notification from '../models/notification.model.js';
import { sendNotificationToUser } from '../socket/socket.js';

jest.mock('../models/phase.model.js');
jest.mock('../models/campaign.model.js');
jest.mock('../models/phaseDay.model.js');
jest.mock('../models/notification.model.js');
jest.mock('../socket/socket.js');

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);
});

describe('phaseService', () => {
  describe('createPhase', () => {
    it('should create a phase and update campaign', async () => {
      const campaign = {
        _id: 'campId',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31')
      };
      const savedPhase = { _id: 'phaseId', name: 'Phase A' };

      Campaign.findById.mockResolvedValue(campaign);
      Phase.mockImplementation(() => ({
        ...savedPhase,
        save: jest.fn().mockResolvedValue(savedPhase)
      }));
      Campaign.findByIdAndUpdate.mockResolvedValue();

      const result = await phaseService.createPhase({
        campaignId: 'campId',
        name: 'Phase A',
        description: 'desc',
        startDate: '2025-03-01',
        endDate: '2025-03-31'
      });

      expect(result._id).toBe(savedPhase._id);
      expect(result.name).toBe(savedPhase.name);
      expect(Campaign.findByIdAndUpdate).toHaveBeenCalledWith('campId', {
        $addToSet: { phases: savedPhase._id }
      });
    });
  });

  describe('updatePhase', () => {
    it('should update phase fields', async () => {
      const phase = {
        _id: 'phaseId',
        campaignId: 'campId',
        name: 'old',
        description: '',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-10'),
        save: jest.fn().mockResolvedValue(true)
      };

      const campaign = {
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31')
      };

      Phase.findById.mockResolvedValue(phase);
      Campaign.findById.mockResolvedValue(campaign);

      const result = await phaseService.updatePhase('phaseId', {
        name: 'new',
        description: 'updated'
      });

      expect(result).toBe(true);
      expect(phase.name).toBe('new');
      expect(phase.description).toBe('updated');
    });
  });

  describe('deletePhase', () => {
    it('should delete phase and remove from campaign', async () => {
      const phase = {
        _id: 'phaseId',
        campaignId: 'campId'
      };
      Phase.findById.mockResolvedValue(phase);
      Phase.findByIdAndDelete.mockResolvedValue(true);
      Campaign.findByIdAndUpdate.mockResolvedValue(true);

      const result = await phaseService.deletePhase('phaseId');

      expect(result).toEqual(phase);
      expect(Campaign.findByIdAndUpdate).toHaveBeenCalledWith('campId', {
        $pull: { phases: 'phaseId' }
      });
    });
  });

  describe('createPhaseDay', () => {
    it('should create a new phase day', async () => {
      Phase.findById.mockResolvedValue({ _id: 'phaseId', phaseDays: [], save: jest.fn() });
      PhaseDay.findOne.mockResolvedValue(null);
      PhaseDay.create.mockResolvedValue({
        _id: 'day1',
        date: '2025-03-01',
        checkinLocation: {
          coordinates: [1, 2],
          address: 'abc'
        }
      });

      const result = await phaseService.createPhaseDay('phaseId', {
        date: '2025-03-01',
        checkinLocation: { coordinates: [1, 2], address: 'abc' }
      });

      expect(result._id).toBe('day1');
    });
  });

  describe('updatePhaseDay', () => {
    it('should update and return phase day', async () => {
      const phaseDay = {
        date: new Date(),
        checkinLocation: {},
        status: 'upcoming',
        save: jest.fn().mockResolvedValue(true)
      };

      PhaseDay.findById.mockResolvedValue(phaseDay);

      const result = await phaseService.updatePhaseDay('dayId', {
        date: '2025-04-01',
        checkinLocation: { coordinates: [1, 1], address: 'x' },
        status: 'in-progress'
      });

      expect(phaseDay.status).toBe('in-progress');
      expect(result).toEqual(phaseDay);
    });
  });

  describe('deletePhaseDay', () => {
    it('should delete a phase day', async () => {
      const phaseDay = {
        _id: 'day1',
        phaseId: 'phase123',
        deleteOne: jest.fn().mockResolvedValue(true)
      };

      PhaseDay.findById.mockResolvedValue(phaseDay);
      Phase.findByIdAndUpdate.mockResolvedValue(true);

      const result = await phaseService.deletePhaseDay('day1');
      expect(result).toEqual({ message: 'Xoá phaseDay thành công' });
    });
  });

  describe('getPhasesByCampaignId', () => {
    it('should return phases with populated days', async () => {
      Campaign.findById.mockResolvedValue({ _id: 'campId' });
      Phase.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ _id: 'phase1' }])
      });

      const result = await phaseService.getPhasesByCampaignId('campId');
      expect(result).toEqual([{ _id: 'phase1' }]);
    });
  });

  describe('startPhaseService', () => {
    it('should start phase and notify users', async () => {
      const volunteers = [
        { user: 'u1', status: 'approved' },
        { user: 'u2', status: 'pending' }
      ];
      const campaign = {
        _id: 'campId',
        name: 'Chiến dịch A',
        volunteers
      };

      const phase = {
        _id: 'phaseId',
        name: 'Phase A',
        startDate: new Date(Date.now() - 100000),
        status: 'upcoming',
        campaignId: campaign,
        phaseDays: [],
        save: jest.fn().mockResolvedValue(true)
      };

      Phase.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(phase) });

      Notification.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(true)
      }));

      const result = await phaseService.startPhaseService('phaseId');

      expect(result.status).toBe('in-progress');
      expect(sendNotificationToUser).toHaveBeenCalledWith('u1', expect.any(Object));
      expect(sendNotificationToUser).not.toHaveBeenCalledWith('u2', expect.any(Object));
    });
  });
});