export const sendNotificationToUser = jest.fn();  // Mock hàm này
// Nếu có hàm khác như getIO, mock thêm: export const getIO = jest.fn(() => ({ to: jest.fn(), emit: jest.fn() }));