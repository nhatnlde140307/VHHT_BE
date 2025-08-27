import { Router } from "express";
import { getDashboard, getstats } from "../controllers/dashboard.controller.js";

const dashboardrouter = Router();

dashboardrouter.get("/campaigns/:id/dashboard", getDashboard);

dashboardrouter.get('/stats', getstats)

export default dashboardrouter;
