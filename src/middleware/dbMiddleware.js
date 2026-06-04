const mongoose = require("mongoose");

const requireDatabase = (req, res, next) => {
  if (mongoose.connection.readyState === 1) {
    return next();
  }

  return res.status(503).json({
    message: "Base de datos no disponible. Verifica MONGO_URI y que el cluster de MongoDB Atlas esté activo."
  });
};

module.exports = { requireDatabase };
