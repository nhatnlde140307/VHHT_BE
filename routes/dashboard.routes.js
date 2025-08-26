import { Router } from "express";
import { getDashboard } from "../controllers/dashboard.controller.js";

const dashboardrouter = Router();

dashboardrouter.get("/campaigns/:id/dashboard", getDashboard);

export default dashboardrouter;
