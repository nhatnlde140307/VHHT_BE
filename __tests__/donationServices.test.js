import DonationServices from '../services/donationCampaign.service.js';
import DonationCampaign from '../models/donationCampaign.model.js';
import User from '../models/users.model.js';
import { MailGenerator, transporter } from '../utils/nodemailerConfig.js';
import DonationTransaction from '../models/donationTransaction.model.js';


jest.mock('../models/donationCampaign.model.js');
jest.mock('../models/users.model.js');
jest.mock('../models/donationTransaction.model.js');
jest.mock('../utils/nodemailerConfig.js');

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => { });
  jest.spyOn(console, 'error').mockImplementation(() => { });
});

describe('DonationServices', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('approve()', () => {
    it('phê duyệt thành công và gửi email', async () => {
      const mockCampaign = {
        _id: 'abc',
        title: 'Chiến dịch test',
        createdBy: 'user123'
      };

      DonationCampaign.findByIdAndUpdate.mockResolvedValue(mockCampaign);
      User.findById.mockResolvedValue({
        email: 'user@example.com',
        name: 'Tester'
      });

      const result = await DonationServices.approve('abc');

      expect(DonationCampaign.findByIdAndUpdate).toHaveBeenCalledWith(
        'abc',
        { approvalStatus: 'approved' },
        { new: true }
      );
      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(transporter.sendMail).toHaveBeenCalled();
      expect(result).toEqual(mockCampaign);
    });

    it('không tìm thấy campaign', async () => {
      DonationCampaign.findByIdAndUpdate.mockResolvedValue(null);

      await expect(DonationServices.approve('invalid-id')).rejects.toThrow('Không tìm thấy chiến dịch');
    });
  });

  describe('reject()', () => {
    it('từ chối thành công và gửi email', async () => {
      const mockCampaign = {
        _id: 'xyz',
        title: 'Chiến dịch test',
        createdBy: 'user456'
      };

      DonationCampaign.findByIdAndUpdate.mockResolvedValue(mockCampaign);
      User.findById.mockResolvedValue({
        email: 'reject@example.com',
        name: 'RejectUser'
      });

      const result = await DonationServices.reject('xyz');

      expect(DonationCampaign.findByIdAndUpdate).toHaveBeenCalledWith(
        'xyz',
        { approvalStatus: 'rejected' },
        { new: true }
      );
      expect(User.findById).toHaveBeenCalledWith('user456');
      expect(transporter.sendMail).toHaveBeenCalled();
      expect(result).toEqual(mockCampaign);
    });
  });

  describe('getAll()', () => {
    it('trả về danh sách campaign đã approved', async () => {
      const mockData = [{ title: 'Chiến dịch 1' }, { title: 'Chiến dịch 2' }];
      DonationCampaign.find.mockImplementation(() => ({
        sort: () => ({
          skip: () => ({
            limit: () => ({
              populate: jest.fn().mockResolvedValue(mockData)
            })
          })
        })
      }));
      DonationCampaign.countDocuments.mockResolvedValue(2);

      const result = await DonationServices.getAll({ page: 1, limit: 2 });

      expect(result.data.length).toBe(2);
      expect(result.pagination.total).toBe(2);
    });
  });
});

describe('create()', () => {
  it('tạo chiến dịch thành công khi đủ dữ liệu', async () => {
    const mockData = {
      title: 'Cứu trợ bão lũ',
      description: 'Giúp người dân Hà Tĩnh',
      goalAmount: 1000000,
      tags: ['bão', 'lũ'],
    };

    const fakeCampaign = {
      ...mockData,
      save: jest.fn().mockResolvedValue({ _id: '123', ...mockData })
    };

    // Mock DonationCampaign constructor
    DonationCampaign.mockImplementation(() => fakeCampaign);

    const result = await DonationServices.create([], 'thumbnail.jpg', mockData, 'user123');

    expect(result._id).toBe('123');
    expect(fakeCampaign.save).toHaveBeenCalled();
  });

  it('lỗi nếu thiếu trường bắt buộc', async () => {
    await expect(
      DonationServices.create([], '', {}, 'user123')
    ).rejects.toThrow('Thiếu trường bắt buộc');
  });
});

describe('updateDonationCampaign()', () => {
  it('cập nhật thành công với ảnh và thumbnail', async () => {
    const mockCampaign = {
      title: 'Cũ',
      description: '...',
      goalAmount: 100,
      images: ['img1.jpg'],
      save: jest.fn().mockResolvedValue('cập nhật xong')
    };

    DonationCampaign.findById.mockResolvedValue(mockCampaign);

    const payload = {
      title: 'Mới',
      goalAmount: 200
    };

    const result = await DonationServices.updateDonationCampaign(
      ['img2.jpg'],
      payload,
      'newThumb.jpg',
      '507f191e810c19729de860ea'
    );

    expect(result).toBe('cập nhật xong');
    expect(mockCampaign.title).toBe('Mới');
    expect(mockCampaign.goalAmount).toBe(200);
    expect(mockCampaign.thumbnail).toBe('newThumb.jpg');
    expect(mockCampaign.images).toContain('img2.jpg');
    expect(mockCampaign.save).toHaveBeenCalled();
  });

  it('lỗi nếu ID không hợp lệ', async () => {
    await expect(
      DonationServices.updateDonationCampaign([], {}, '', 'id-sai')
    ).rejects.toThrow('ID chiến dịch không hợp lệ');
  });

  it('lỗi nếu không tìm thấy chiến dịch', async () => {
    DonationCampaign.findById.mockResolvedValue(null);

    await expect(
      DonationServices.updateDonationCampaign([], {}, '', '656ef8eb3c1d88b317123456')
    ).rejects.toThrow('Không tìm thấy chiến dịch');
  });
});

describe('getbyId()', () => {
  it('trả về campaign và transaction thành công', async () => {
    const fakeCampaign = { _id: '1', title: 'Chiến dịch A' };
    const fakeTransactions = [
      { amount: 100, paymentStatus: 'success' },
      { amount: 200, paymentStatus: 'success' }
    ];

    const mockSecondPopulate = jest.fn().mockResolvedValue(fakeCampaign);
    const mockFirstPopulate = jest.fn().mockReturnValue({ populate: mockSecondPopulate });

    DonationCampaign.findById.mockReturnValue({ populate: mockFirstPopulate });

    DonationTransaction.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue(fakeTransactions)
    });

    const result = await DonationServices.getbyId('abc');

    expect(result.campaign.title).toBe('Chiến dịch A');
    expect(result.transactions.length).toBe(2);
  });

});
