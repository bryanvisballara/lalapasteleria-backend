import { io } from "socket.io-client";

export const connectSellerSocket = (token) => {
  const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

  return io(socketUrl, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    transports: ["websocket"]
  });
};
