import donationService from '../services/donationCampaign.service.js';
import DonationCampaign from '../models/donationCampaign.model.js';
import User from '../models/users.model.js';
import DonationTransaction from '../models/donationTransaction.model.js';
import * as nodemailer from '../utils/nodemailerConfig.js';
import aiService from '../services/ai.servive.js';
import axios from 'axios';
import mongoose from 'mongoose';

jest.mock('../models/donationCampaign.model.js');
jest.mock('../models/users.model.js');
jest.mock('../models/donationTransaction.model.js');
jest.mock('../services/ai.servive.js');
jest.mock('axios');
jest.mock('../utils/nodemailerConfig.js', () => ({
  MailGenerator: {
    generate: jest.fn().mockReturnValue('<p>Email content</p>')
  },
  transporter: {
    sendMail: jest.fn()
  }
}));

describe('DonationServices', () => {
  beforeEach(() => {
    jest.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);
  });
  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should create a new donation campaign', async () => {
      const mockCampaign = { save: jest.fn().mockResolvedValue({ title: 'Test' }) };
      DonationCampaign.mockImplementation(() => mockCampaign);

      const result = await donationService.create(['img.jpg'], 'thumb.jpg', {
        title: 'Test',
        description: 'Desc',
        goalAmount: 1000,
        tags: [],
      }, 'userId');

      expect(result.title).toBe('Test');
      expect(mockCampaign.save).toHaveBeenCalled();
    });

    it('should throw error when required fields are missing', async () => {
      await expect(() =>
        donationService.create([], '', {}, 'userId')
      ).rejects.toThrow('Thiếu trường bắt buộc');
    });
  });

  describe('approve', () => {
    it('should approve and send email + zapier', async () => {
      DonationCampaign.findByIdAndUpdate.mockResolvedValue({
        _id: '1',
        title: 'Test',
        description: 'Description',
        goalAmount: 5000,
        createdBy: 'user1',
        thumbnail: 'image.jpg'
      });

      User.findById.mockResolvedValue({ name: 'A', email: 'test@example.com' });

      aiService.generateFundraisingContent.mockResolvedValue('Gây xúc động...');
      axios.post.mockResolvedValue({});

      const result = await donationService.approve('1');

      expect(result.title).toBe('Test');
      expect(nodemailer.transporter.sendMail).toHaveBeenCalled();
      expect(axios.post).toHaveBeenCalled();
    });

    it('should throw error if campaign not found', async () => {
      DonationCampaign.findByIdAndUpdate.mockResolvedValue(null);
      await expect(donationService.approve('fake')).rejects.toThrow('Không tìm thấy chiến dịch');
    });
  });

  describe('reject', () => {
    it('should reject and send email', async () => {
      DonationCampaign.findByIdAndUpdate.mockResolvedValue({
        _id: '1',
        title: 'Test',
        createdBy: 'user1'
      });

      User.findById.mockResolvedValue({ name: 'B', email: 'test@example.com' });

      const result = await donationService.reject('1');

      expect(result.title).toBe('Test');
      expect(nodemailer.transporter.sendMail).toHaveBeenCalled();
    });

    it('should throw error if campaign not found', async () => {
      DonationCampaign.findByIdAndUpdate.mockResolvedValue(null);
      await expect(donationService.reject('fake')).rejects.toThrow('Không tìm thấy chiến dịch');
    });
  });

  describe('completeCampaign', () => {
    it('should mark campaign as completed', async () => {
      const saveMock = jest.fn().mockResolvedValue({ status: 'completed' });
      DonationCampaign.findById.mockResolvedValue({ status: 'active', save: saveMock });

      const result = await donationService.completeCampaign('123');

      expect(result.status).toBe('completed');
    });

    it('should throw error if campaign is already completed', async () => {
      DonationCampaign.findById.mockResolvedValue({ status: 'completed' });
      await expect(donationService.completeCampaign('123')).rejects.toThrow('Chiến dịch đã kết thúc trước đó');
    });
  });

  describe('getAll', () => {
    it('should return campaigns with pagination', async () => {
      DonationCampaign.find.mockReturnValue({
        sort: () => ({
          skip: () => ({
            limit: () => ({
              populate: jest.fn().mockResolvedValue([{ title: 'Test' }])
            })
          })
        })
      });
      DonationCampaign.countDocuments.mockResolvedValue(1);

      const result = await donationService.getAll({});

      expect(result.data.length).toBe(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('getById', () => {
    it('should return campaign and transactions', async () => {
      DonationCampaign.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        title: 'Test'
      });
      DonationTransaction.find.mockReturnValue({
        sort: jest.fn().mockReturnValue([{ amount: 1000 }])
      });

      const result = await donationService.getbyId('id');
      expect(result.campaign.title).toBe('Test');
    });

    it('should return null if not found', async () => {
      const populateMock = jest.fn().mockResolvedValue(null);
      const chainMock = { populate: jest.fn(() => ({ populate: populateMock })) };
      DonationCampaign.findById.mockReturnValue(chainMock);

      const result = await donationService.getbyId('id');
      expect(result).toBeNull();
    });
  });
});

  describe('updateDonationCampaign', () => {
    it('should update campaign with new images and thumbnail', async () => {
      const saveMock = jest.fn().mockResolvedValue({
        title: 'Updated',
        images: ['old.jpg', 'new.jpg'],
        thumbnail: 'new-thumb.jpg'
      });

      DonationCampaign.findById.mockResolvedValue({
        _id: '123',
        title: 'Old',
        description: 'Old desc',
        images: ['old.jpg'],
        save: saveMock
      });

      const result = await donationService.updateDonationCampaign(
        ['new.jpg'],
        {
          title: 'Updated',
          description: 'New desc',
          goalAmount: 5000,
        },
        'new-thumb.jpg',
        '123'
      );

      expect(result.title).toBe('Updated');
      expect(result.images).toContain('new.jpg');
      expect(result.thumbnail).toBe('new-thumb.jpg');
    });

    it('should throw error if ID is invalid', async () => {
      jest.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(false);
      await expect(donationService.updateDonationCampaign([], {}, null, 'invalid_id'))
        .rejects.toThrow('ID chiến dịch không hợp lệ');
    });

    it('should throw error if campaign not found', async () => {
      jest.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);
      DonationCampaign.findById.mockResolvedValue(null);

      await expect(donationService.updateDonationCampaign([], {}, null, '64b6b8c5e3c6e3c6e3c6e3c6'))
        .rejects.toThrow('Không tìm thấy chiến dịch');
    });
  });