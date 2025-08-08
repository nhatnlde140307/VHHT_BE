import mongoose from 'mongoose';
import {
  createExpenseService,
  approveExpenseService,
  getExpensesByCampaignService,
  deleteExpenseService,
  editExpenseService,
  getExpenseSummaryService
} from '../services/donationExpense.service.js';

import DonationExpense from '../models/donationExpense.model.js';
import DonationCampaign from '../models/donationCampaign.model.js';

jest.mock('../models/donationExpense.model.js');
jest.mock('../models/donationCampaign.model.js');

describe('donationExpenseService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should create a new expense', async () => {
    const mockSave = jest.fn().mockResolvedValue({ _id: '1' });
    DonationExpense.mockImplementation(() => ({ save: mockSave }));

    const result = await createExpenseService({ amount: 100 });
    expect(result).toEqual({ _id: '1' });
    expect(mockSave).toHaveBeenCalled();
  });

  it('should approve an expense and update campaign amount', async () => {
    const expense = {
      _id: '1',
      amount: 100,
      approvalStatus: 'pending',
      donationCampaignId: 'camp1',
      note: '',
      save: jest.fn().mockResolvedValue(this)
    };
    const campaign = { currentAmount: 200, save: jest.fn() };

    DonationExpense.findById.mockResolvedValue(expense);
    DonationCampaign.findById.mockResolvedValue(campaign);

    const result = await approveExpenseService('1', 'approved', 'note', 'approverId');
    expect(campaign.currentAmount).toBe(100);
    expect(expense.approvalStatus).toBe('approved');
    expect(expense.note).toBe('note');
    expect(result).toEqual(expense);
  });

  it('should reject an approved expense and refund campaign', async () => {
    const expense = {
      _id: '1',
      amount: 50,
      approvalStatus: 'approved',
      donationCampaignId: 'camp1',
      note: '',
      save: jest.fn().mockResolvedValue(this)
    };
    const campaign = { currentAmount: 100, save: jest.fn() };

    DonationExpense.findById.mockResolvedValue(expense);
    DonationCampaign.findById.mockResolvedValue(campaign);

    const result = await approveExpenseService('1', 'rejected', 'reason', 'approverId');
    expect(campaign.currentAmount).toBe(150);
    expect(expense.approvalStatus).toBe('rejected');
    expect(result).toEqual(expense);
  });

  it('should throw if expense not found in approval', async () => {
    DonationExpense.findById.mockResolvedValue(null);
    await expect(approveExpenseService('id', 'approved', '', '')).rejects.toThrow('Không tìm thấy chi phí');
  });

  it('should get expenses by campaign', async () => {
    const mockData = [{ amount: 10 }, { amount: 20 }];
    const mockQuery = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue(mockData),
    };
    DonationExpense.find.mockReturnValue(mockQuery);

    const result = await getExpensesByCampaignService('camp1');
    expect(result).toEqual(mockData);
  });

  it('should delete an expense', async () => {
    DonationExpense.findByIdAndDelete.mockResolvedValue({ _id: 'deleted' });
    const result = await deleteExpenseService('1');
    expect(result).toEqual({ _id: 'deleted' });
  });

  it('should edit a pending expense', async () => {
    const expense = {
      _id: '1',
      approvalStatus: 'pending',
      createdBy: { toString: () => 'u1' },
      save: jest.fn().mockResolvedValue(this),
    };
    DonationExpense.findById.mockResolvedValue(expense);
    const result = await editExpenseService('1', 'u1', 500, 'desc', ['img1']);

    expect(expense.amount).toBe(500);
    expect(expense.description).toBe('desc');
    expect(expense.evidences).toEqual(['img1']);
    expect(result).toEqual(expense);
  });

  it('should throw when editing approved expense', async () => {
    DonationExpense.findById.mockResolvedValue({ approvalStatus: 'approved' });
    await expect(editExpenseService('1', 'u1', 0, '', [])).rejects.toThrow('Không thể sửa chi phí đã duyệt hoặc từ chối');
  });

  it('should throw when editing expense by other user', async () => {
    const expense = {
      approvalStatus: 'pending',
      createdBy: { toString: () => 'u2' }
    };
    DonationExpense.findById.mockResolvedValue(expense);
    await expect(editExpenseService('1', 'u1', 0, '', [])).rejects.toThrow('Bạn không có quyền sửa chi phí này');
  });

  it('should return summary of approved expenses', async () => {
    const mockAgg = [{ totalApprovedExpense: 500, count: 2 }];
    DonationExpense.aggregate.mockResolvedValue(mockAgg);

    const result = await getExpenseSummaryService('5f50ca2e5f50ca2e5f50ca2e');
    expect(result).toEqual({
      campaignId: '5f50ca2e5f50ca2e5f50ca2e',
      totalApprovedExpense: 500,
      count: 2
    });
  });

  it('should return zero summary if no data', async () => {
    DonationExpense.aggregate.mockResolvedValue([]);
    const result = await getExpenseSummaryService('5f50ca2e5f50ca2e5f50ca2f');
    expect(result).toEqual({
      campaignId: '5f50ca2e5f50ca2e5f50ca2f',
      totalApprovedExpense: 0,
      count: 0
    });
  });
});