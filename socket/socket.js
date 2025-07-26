import { Server } from 'socket.io';

let io;

export function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    const { userId, campaignId } = socket.handshake.query;

    if (userId) {
      socket.join(userId);
      console.log(`🟡 Joined user room: ${userId}`);
    }

    if (campaignId) {
      const room = `donate-campaign-${campaignId}`;
      socket.join(room);
      console.log(`🟡 Joined campaign room: ${room}`);
    }

    socket.on('disconnect', () => {
      console.log(`⚪ Socket disconnected: ${socket.id}`);
    });
  });
}

export function getIO() {
  if (!io) throw new Error('❗ Socket.IO not initialized!');
  return io;
}

// ✅ Gửi noti riêng tới user
export function sendNotificationToUser(userId, notification) {
  getIO().to(userId.toString()).emit('notification', notification);
}

// ✅ Gửi điểm cứu trợ mới tới tất cả user
export function broadcastNewReliefPoint(reliefPoint) {
  getIO().emit('relief-point:new', reliefPoint);
}

// ✅ Gửi khi bão được kích hoạt
export function broadcastStormActivated(storm) {
  getIO().emit('storm-activated', storm);
}
