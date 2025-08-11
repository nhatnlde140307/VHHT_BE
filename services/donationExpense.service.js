import DonationExpense from '../models/donationExpense.model.js';
import DonationCampaign from '../models/donationCampaign.model.js';
import mongoose from 'mongoose';

export const createExpenseService = async (data) => {
  const expense = new DonationExpense(data);
  return await expense.save();
};

export const approveExpenseService = async (id, status, note, approverId) => {
  const expense = await DonationExpense.findById(id);
  if (!expense) throw new Error('Không tìm thấy chi phí');

  const campaign = await DonationCampaign.findById(expense.donationCampaignId);
  if (!campaign) throw new Error('Không tìm thấy chiến dịch');

  const oldStatus = expense.approvalStatus;
  const amount = expense.amount;

  if (status === 'approved' && oldStatus !== 'approved') {
    if (amount > campaign.currentAmount) {
      throw new Error('Chi phí vượt quá số dư hiện tại của chiến dịch');
    }

    campaign.currentAmount -= amount;
    await campaign.save();
    expense.remainingBalance = campaign.currentAmount;
  }

  if (status === 'rejected' && oldStatus === 'approved') {
    campaign.currentAmount += amount;
    await campaign.save();
    expense.remainingBalance = campaign.currentAmount;
  }

  expense.approvalStatus = status;
  expense.approvedBy = approverId;
  expense.note = note;

  await expense.save();
  return expense;
};

export const getExpensesByCampaignService = async (campaignId) => {
  return await DonationExpense.find({ donationCampaignId: campaignId })
    .populate('createdBy', 'fullName')
    .populate('approvedBy', 'fullName')
    .sort({ createdAt: -1 });
};

export const deleteExpenseService = async (id) => {
  return await DonationExpense.findByIdAndDelete(id);
};

export const editExpenseService = async (id, userId, amount, description, images) => {
  const expense = await DonationExpense.findById(id);
  if (!expense) throw new Error('Không tìm thấy chi phí');
  if (expense.approvalStatus !== 'pending') throw new Error('Không thể sửa chi phí đã duyệt hoặc từ chối');
  if (expense.createdBy.toString() !== userId) throw new Error('Bạn không có quyền sửa chi phí này');

  if (amount) expense.amount = amount;
  if (description) expense.description = description;
  if (images.length > 0) expense.evidences = images;

  await expense.save();
  return expense;
};

export const getExpenseSummaryService = async (campaignId) => {
  const result = await DonationExpense.aggregate([
    {
      $match: {
        donationCampaignId: new mongoose.Types.ObjectId(campaignId),
        approvalStatus: 'approved'
      }
    },
    {
      $group: {
        _id: '$donationCampaignId',
        totalApprovedExpense: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);

  const summary = result[0] || { totalApprovedExpense: 0, count: 0 };
  return {
    campaignId,
    ...summary
  };
};