import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import databaseServices from "./services/database.services.js";
import { defaultErrorHandler } from "./middlewares/errors.middlewares.js";
// cron jobs
import "./cronJobs/phaseDayScheduler.js";
import "./cronJobs/weatherAlertCron.js";

// routes
import usersRouter from "./routes/users.routes.js";
import commentRouter from "./routes/comment.routes.js";
import campaignRoutes from "./routes/campaign.routes.js";
import checkinRoutes from "./routes/checkins.routes.js";
import aiRouter from "./routes/ai.routes.js";
import uploadRouter from "./routes/upload.routes.js";
import newsPostRoutes from "./routes/news.routes.js";
import certificateRoutes from "./routes/cerificate.routes.js";
import donateRouter from "./routes/donationCampaign.routes.js";
import notiRouter from "./routes/notification.routes.js";
import paymentsRoutes from "./routes/payment.routes.js";
import phaseRouter from "./routes/phase.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import stormRouter from "./routes/storm.routes.js";
import rlPointrouter from "./routes/reliefPoint.routes.js";
import issueRouter from "./routes/issue.routes.js";
import forumRoutes from "./routes/forum.routes.js";
import taskRouter from "./routes/task.routes.js";
import Erouter from "./routes/donationExpense.routes.js";
import tempCertrouter from "./routes/templateCert.routes.js";
import dashboardrouter from "./routes/dashboard.routes.js";
import r from "./routes/push.router.js";
import { initSocket } from "./socket/socket.js";

config();

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 4000;

app.enable("trust proxy");

// ================== CORS ==================
const allowRegexes = [
  /^https?:\/\/localhost:\d+$/,
  /^https:\/\/.+\.vercel\.app$/
];

const allowlist = [process.env.FRONTEND_URL, process.env.FRONTEND_URL_STAGING].filter(Boolean);

function corsOrigin(origin, cb) {
  if (!origin) return cb(null, true);
  const inList = allowlist.includes(origin);
  const matchRegex = allowRegexes.some((re) => re.test(origin));
  return inList || matchRegex ? cb(null, true) : cb(new Error("Not allowed by CORS"));
}

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
  })
);
app.use((_, res, next) => {
  res.setHeader("Vary", "Origin");
  next();
});
app.options(/.*/, cors({ origin: corsOrigin, credentials: true }));

// ================== Middleware ==================
databaseServices.connect();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
initSocket(server);

// ================== API Routes ==================
function safeMount(path, router) {
  try {
    console.log("[MOUNT] ->", path);
    app.use(path, router);
  } catch (e) {
    console.error("[MOUNT ERROR] at:", path);
    throw e;
  }
}

safeMount("/users", usersRouter);
safeMount("/payments", paymentsRoutes);
safeMount("/campaigns", campaignRoutes);
safeMount("/checkin", checkinRoutes);
safeMount("/ai", aiRouter);
safeMount("/cloud", uploadRouter);
safeMount("/news", newsPostRoutes);
safeMount("/certificate", certificateRoutes);
safeMount("/donate", donateRouter);
safeMount("/comment", commentRouter);
safeMount("/notification", notiRouter);
safeMount("/phase", phaseRouter);
safeMount("/category", categoryRoutes);
safeMount("/storm", stormRouter);
safeMount("/relief-point", rlPointrouter); 
safeMount("/issue", issueRouter);
safeMount("/forum", forumRoutes);
safeMount("/task", taskRouter);
safeMount("/expense", Erouter);
safeMount("/tempCert", tempCertrouter);
safeMount("/dashboard", dashboardrouter);
app.use("/push", r);

app.get("/", (req, res) => {
  res.status(200).json("Hello to VHHT API 🚀");
});

// ================== Serve Frontend (PWA) ==================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.resolve(__dirname, "../VolunteerHub_FE/dist");

// Serve static FE build
app.use(express.static(distPath));

// Service Worker phải từ root
app.get("/sw.js", (req, res) => {
  res.sendFile(path.join(distPath, "sw.js"));
});

// Manifest cần đúng Content-Type
app.get("/manifest.webmanifest", (req, res) => {
  res.type("application/manifest+json");
  res.sendFile(path.join(distPath, "manifest.webmanifest"));
});

// React Router fallback (bắt mọi route không khớp API)
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});


// ================== Error Handler ==================
app.use(defaultErrorHandler);

// ================== Start Server ==================
server.listen(port, () => {
  console.log(`🔥 Server is running on port ${port}`);
});
