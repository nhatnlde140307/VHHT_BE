import IssueService from '../services/issue.service.js';

export const createIssue = async (req, res) => {
  try {
    const userId = req.decoded_authorization.user_id; // Sửa theo yêu cầu
    const issueData = req.body;
    issueData.reportedBy = userId; // Thay vì req.user._id
    const newIssue = await IssueService.createIssue(issueData);
    res.status(201).json(newIssue);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getIssues = async (req, res) => {
  try {
    const userId = req.decoded_authorization.user_id; // Sửa
    const filters = req.query; // Ví dụ: ?type=task_issue&status=open
    const issues = await IssueService.getIssues(filters, { _id: userId });
    res.json(issues);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getIssueById = async (req, res) => {
  try {
    const issue = await IssueService.getIssueById(req.params.id);
    if (!issue) return res.status(404).json({ message: 'Issue not found' });
    res.json(issue);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateIssue = async (req, res) => {
  try {
    const userId = req.decoded_authorization.user_id; // Sửa
    const updatedIssue = await IssueService.updateIssue(req.params.id, req.body, { _id: userId });
    res.json(updatedIssue);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteIssue = async (req, res) => {
  try {
    const userId = req.decoded_authorization.user_id; // Sửa
    await IssueService.deleteIssue(req.params.id, { _id: userId });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};