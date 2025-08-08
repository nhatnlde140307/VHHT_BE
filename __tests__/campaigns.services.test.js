import mongoose from 'mongoose';
import campaignServices from '../services/campaigns.services.js';
import Campaign from '../models/campaign.model.js';
import User from '../models/users.model.js';

jest.mock('../models/campaign.model.js');
jest.mock('../models/users.model.js');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('CampaignService', () => {
  describe('createCampaign', () => {
    it('should create a new campaign', async () => {
      const mockCampaignData = {
        name: 'New Campaign',
        description: 'A new campaign',
        startDate: new Date(),
        endDate: new Date(),
        location: { type: 'Point', coordinates: [105.85, 21.02], address: 'HN' },
        image: 'image.png',
      };

      const mockSavedCampaign = {
        save: expect.any(Function)
      };

      Campaign.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(mockSavedCampaign),
      }));

      const result = await campaignServices.createCampaign(mockCampaignData);

      expect(Campaign).toHaveBeenCalled();
      expect(result).toEqual(mockSavedCampaign);
    });
  });

  describe('getVolunteerListCampaigns', () => {
    it('should return joined campaigns of user', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const mockUser = {
        joinedCampaigns: [
          {
            _id: 'c1',
            name: 'Test Campaign',
            description: 'A test campaign',
            startDate: new Date('2025-01-01'),
            endDate: new Date('2025-02-01'),
            status: 'in-progress',
            location: { type: 'Point', coordinates: [105.85, 21.02], address: 'HN' },
            image: 'image.jpg',
            gallery: [],
            phases: [
              {
                _id: 'p1',
                name: 'Phase 1',
                startDate: new Date(),
                endDate: new Date(),
                status: 'active'
              }
            ]
          }
        ]
      };

      User.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUser)
      });

      const result = await campaignServices.getVolunteerListCampaigns(userId);

      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(result).toHaveProperty('listCampaign');
      expect(result.listCampaign).toHaveLength(1);
      expect(result.listCampaign[0]).toHaveProperty('name', 'Test Campaign');
    });

    it('should throw 400 error with invalid userId', async () => {
      await expect(campaignServices.getVolunteerListCampaigns('invalid')).rejects.toThrow('Invalid userId');
    });

    it('should throw 404 error if user not found', async () => {
      const validId = new mongoose.Types.ObjectId().toString();
      User.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
      await expect(campaignServices.getVolunteerListCampaigns(validId)).rejects.toThrow('Volunteer not found');
    });
  });

  // describe('getCampaigns', () => {
  //   it('should return all campaigns', async () => {
  //     const mockCampaigns = [
  //       { _id: '1', name: 'Campaign 1' },
  //       { _id: '2', name: 'Campaign 2' }
  //     ];

  //     const mockQuery = {
  //       populate: jest.fn().mockReturnThis(),
  //       sort: jest.fn().mockReturnThis(),
  //       skip: jest.fn().mockReturnThis(),
  //       limit: jest.fn().mockReturnThis(),
  //       lean: jest.fn().mockResolvedValue(mockCampaigns),
  //     };

  //     Campaign.find.mockReturnValue(mockQuery);

  //     const result = await campaignServices.getListCampaigns({});

  //     expect(Campaign.find).toHaveBeenCalled();
  //     expect(result.campaigns).toEqual(mockCampaigns);
  //   });
  // });

});