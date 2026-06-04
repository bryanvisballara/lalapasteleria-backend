require("dotenv").config();
const dns = require("dns");
const mongoose = require("mongoose");

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const run = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error("MONGO_URI no está definido en .env");
  }

  const hostMatch = uri.match(/@([^/?]+)/);
  const host = hostMatch ? hostMatch[1] : "desconocido";
  console.log(`Probando host: ${host}`);

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
  const collections = await mongoose.connection.db.listCollections().toArray();

  console.log("✅ MongoDB conectado");
  console.log(`Base de datos: ${mongoose.connection.name}`);
  console.log(
    collections.length
      ? `Colecciones: ${collections.map((item) => item.name).join(", ")}`
      : "Colecciones: (ninguna todavía — ejecuta npm run seed)"
  );
};

run()
  .catch((error) => {
    console.error("❌ No se pudo conectar:", error.message);
    console.error("Copia la connection string completa desde Atlas → Connect → Drivers.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close().catch(() => {});
  });
