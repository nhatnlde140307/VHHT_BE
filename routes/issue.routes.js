import express from "express";
import {
  createIssue,
  getIssues,
  getIssueById,
  updateIssue,
  deleteIssue,
} from "../controllers/issue.controller.js";
import {
  accessTokenValidator,
  organizationAndManagerValidator,
} from "../middlewares/users.middlewares.js";
const issueRouter = express.Router();

// Áp dụng auth cho tất cả routes
issueRouter.use(accessTokenValidator);

// Tạo issue mới
issueRouter.post("/", accessTokenValidator, createIssue);

// Lấy danh sách issues (có thể filter)
issueRouter.get("/", accessTokenValidator, getIssues);

// Lấy chi tiết issue
issueRouter.get("/:id", accessTokenValidator, getIssueById);

// Update issue
issueRouter.put("/:id", organizationAndManagerValidator, updateIssue);

// Xóa issue
issueRouter.delete("/:id", organizationAndManagerValidator, deleteIssue);

export default issueRouter;
