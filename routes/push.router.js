import { Router } from "express";
import webpush from "web-push";

const r = Router();
webpush.setVapidDetails("mailto:admin@example.com", process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

// Lưu DB thật trong hệ thống của bạn. Ở đây dùng Map để đơn giản.
const subs = new Map(); // key: deviceId, val: subscription

r.get("/vapid-key", (req, res) => res.json({ key: process.env.VAPID_PUBLIC_KEY }));

r.post("/subscribe", (req, res) => {
  const { deviceId, userId, subscription } = req.body || {};
  if (!deviceId || !subscription) return res.status(400).json({ ok: false });
  subs.set(deviceId, { ...subscription, userId });
  return res.status(201).json({ ok: true });
});

r.post("/send", async (req, res) => {
  const { title = "Thông báo", body = "", url = "/", userId } = req.body || {};
  const payload = JSON.stringify({ title, body, url });

  let sent = 0;
  for (const [deviceId, sub] of subs) {
    if (userId && sub.userId !== userId) continue;
    try {
      await webpush.sendNotification(sub, payload);
      sent++;
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) subs.delete(deviceId);
    }
  }
  res.json({ sent });
});

r.delete("/unsubscribe/:deviceId", (req, res) => {
  subs.delete(req.params.deviceId);
  res.json({ ok: true });
});

export default r;
