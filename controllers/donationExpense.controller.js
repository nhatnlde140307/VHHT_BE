import {
  createExpenseService,
  approveExpenseService,
  getExpensesByCampaignService,
  deleteExpenseService,
  editExpenseService,
  getExpenseSummaryService
} from '../services/donationExpense.service.js';

export const createExpense = async (req, res) => {
  try {
    const userId = req.decoded_authorization.user_id;
    const { donationCampaignId, amount, description } = req.body;
    const images = req.files?.map(file => file.path) || [];

    const data = {
      donationCampaignId,
      amount,
      description,
      evidences: images,
      createdBy: userId
    };

    const expense = await createExpenseService(data);
    res.status(201).json({ message: 'Tạo chi phí thành công', data: expense });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const approveExpense = async (req, res) => {
  try {
    const userId = req.decoded_authorization.user_id;
    const { id } = req.params;
    const { note } = req.body;

    const expense = await approveExpenseService(id, 'approved', note, userId);
    res.json({ message: 'Đã duyệt chi phí', data: expense });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const rejectExpense = async (req, res) => {
  try {
    const userId = req.decoded_authorization.user_id;
    const { id } = req.params;
    const { note } = req.body;

    const expense = await approveExpenseService(id, 'rejected', note, userId);
    res.json({ message: 'Đã từ chối chi phí', data: expense });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const editExpense = async (req, res) => {
  try {
    const userId = req.decoded_authorization.user_id;
    const { id } = req.params;
    const { amount, description } = req.body;
    const images = req.files?.map(file => file.path) || [];

    const updated = await editExpenseService(id, userId, amount, description, images);
    res.json({ message: 'Cập nhật chi phí thành công', data: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getExpensesByCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const expenses = await getExpensesByCampaignService(campaignId);
    res.json({ data: expenses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getExpenseSummary = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const summary = await getExpenseSummaryService(campaignId);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    await deleteExpenseService(id);
    res.json({ message: 'Đã xoá chi phí' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};