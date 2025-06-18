import { Server } from "socket.io";

let io;

export function initSocket(server) {
   io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL, 
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;
    if (userId) {
      socket.join(userId); 
      console.log(`User ${userId} connected`);
    }

    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected`);
    });
  });
}

export function getIO() {
  if (!io) throw new Error("Socket.IO not initialized!");
  return io;
}