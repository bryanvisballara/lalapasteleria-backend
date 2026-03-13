const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");

let ioInstance;

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

const initSocket = (httpServer) => {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: "*"
    }
  });

  ioInstance.use((socket, next) => {
    try {
      const authToken = socket.handshake.auth?.token;
      const headerToken = socket.handshake.headers?.authorization;

      let token = authToken;
      if (!token && headerToken && headerToken.startsWith("Bearer ")) {
        token = headerToken.split(" ")[1];
      }

      if (!token) {
        return next(new Error("Token requerido para Socket.IO"));
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = decoded;
      return next();
    } catch (error) {
      return next(new Error("Token inválido en Socket.IO"));
    }
  });

  ioInstance.on("connection", (socket) => {
    const userId = socket.user.id;
    const role = socket.user.role;

    socket.join(`user_${userId}`);

    if (role === "seller") {
      socket.join("sellers");
    }

    if (role === "admin") {
      socket.join("admins");
    }

    socket.emit("socket_ready", {
      userId,
      role,
      rooms: [
        `user_${userId}`,
        ...(role === "seller" ? ["sellers"] : []),
        ...(role === "admin" ? ["admins"] : [])
      ]
    });
  });

  return ioInstance;
};

const getIO = () => {
  if (!ioInstance) {
    throw new Error("Socket.IO no inicializado");
  }

  return ioInstance;
};

module.exports = {
  initSocket,
  getIO
};
