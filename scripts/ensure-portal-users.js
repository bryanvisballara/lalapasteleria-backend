require("dotenv").config();
const dns = require("dns");
const mongoose = require("mongoose");
const { ensurePortalUsers, PORTAL_USERS } = require("../src/services/portalUserService");

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const run = async () => {
  if (!process.env.MONGO_URI) {
    console.error("❌ Falta MONGO_URI en .env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  await ensurePortalUsers();

  console.log("\nCredenciales del portal:");
  for (const portalUser of PORTAL_USERS) {
    console.log(`- ${portalUser.email} / ${portalUser.password}`);
  }

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exit(1);
});
