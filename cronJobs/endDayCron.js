import { sendNotificationToUser } from "../socket/socket.js";
import cron from "node-cron";
import PhaseDay from "../models/phaseDay.model.js";
import Task from "../models/task.model.js";
import Notification from "../models/notification.model.js";
import User from "../models/users.model.js"

async function checkPhaseDayTasks() {
  try {
    console.log("🔍 Cron check PhaseDay tasks in-progress...");

    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const phaseDays = await PhaseDay.find({
      date: { $gte: startOfDay, $lte: endOfDay }
    }).populate("tasks");

    for (const pd of phaseDays) {
      const inProgressTasks = pd.tasks.filter(t => t.status === "in_progress");

      if (inProgressTasks.length > 0) {
        console.log(
          `⚠️ PhaseDay ${pd._id} (ngày ${pd.date.toISOString()}) còn ${inProgressTasks.length} task đang in-progress:`
        );

        inProgressTasks.forEach(t => {
          console.log(`   - Task ${t._id} | ${t.title}`);
        });

        // Lấy tất cả staff (tổ chức)
        const staffs = await User.find({ role: "organization" });

        // 👉 Tạo thông báo cho từng task + từng staff
        let notifications = [];
        for (const t of inProgressTasks) {
          for (const staff of staffs) {
            notifications.push({
              title: "⚠️ Task đã tự đóng do quá hạn",
              content: `Task "${t.title}" đã tự kết thúc do hết ngày.`,
              link: `/staff/campaigns`,
              type: "campaign_approved",
              recipient: staff._id,
            });
          }
        }

        // Lưu + gửi notification
        const savedNotifications = await Notification.insertMany(notifications);
        savedNotifications.forEach(n => {
          sendNotificationToUser(n.recipient, n);
        });

        // 👉 Update status task
        for (const t of inProgressTasks) {
          await Task.findByIdAndUpdate(t._id, { status: "completed" });
          console.log(`   ✅ Task ${t._id} đã chuyển sang completed`);
        }
      }
    }

    console.log("✅ Cron check done.");
  } catch (err) {
    console.error("❌ Cron check error:", err);
  }
}

// Cron job (23:59 mỗi ngày)
cron.schedule("59 23 * * *", checkPhaseDayTasks);
