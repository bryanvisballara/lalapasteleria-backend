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
  const customerInquiries = collections.some((item) => item.name === "customerinquiries")
    ? await mongoose.connection.db.collection("customerinquiries").countDocuments()
    : 0;
  const users = collections.some((item) => item.name === "users")
    ? await mongoose.connection.db.collection("users").countDocuments()
    : 0;

  console.log("✅ MongoDB conectado");
  console.log(`Base de datos: ${mongoose.connection.name}`);
  console.log(`Usuarios: ${users}`);
  console.log(`Clientes (customerinquiries): ${customerInquiries}`);
  console.log(
    collections.length
      ? `Colecciones: ${collections.map((item) => item.name).join(", ")}`
      : "Colecciones: (ninguna todavía — ejecuta npm run seed)"
  );

  if (!String(uri).includes("/lalapasteleria")) {
    console.warn("⚠️  La URI no termina en /lalapasteleria. Render podría estar leyendo otra base distinta a la de tu entorno local.");
  }
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
