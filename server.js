require("dotenv").config();
const http = require("http");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dns = require("dns");
const path = require("path");
const { initSocket } = require("./src/socket/socket");
const authRoutes = require("./src/routes/authRoutes");
const categoryRoutes = require("./src/routes/categoryRoutes");
const productRoutes = require("./src/routes/productRoutes");
const neighborhoodRoutes = require("./src/routes/neighborhoodRoutes");
const orderRoutes = require("./src/routes/orderRoutes");
const adminRoutes = require("./src/routes/adminRoutes");
const cartRoutes = require("./src/routes/cartRoutes");
const userRoutes = require("./src/routes/userRoutes");
const { ensurePortalUsers } = require("./src/services/portalUserService");

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const publicSiteDir = path.resolve(process.cwd(), "public-site");
app.use(express.static(publicSiteDir));

app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/neighborhoods", neighborhoodRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/users", userRoutes);

const connectMongo = async () => {
	if (!process.env.MONGO_URI) {
		console.log("❌ MONGO_URI no está definido en .env");
		return;
	}

	try {
		await mongoose.connect(process.env.MONGO_URI, {
			serverSelectionTimeoutMS: 15000
		});
		console.log("✅ MongoDB conectado");
		await ensurePortalUsers();
	} catch (err) {
		console.log("❌ Error MongoDB:", err.message);
	}
};

connectMongo();

app.get("/", (req, res) => {
	res.sendFile(path.join(publicSiteDir, "index.html"));
});

app.get("/privacy", (req, res) => {
	res.sendFile(path.join(publicSiteDir, "privacy.html"));
});

app.get("/contact", (req, res) => {
	res.sendFile(path.join(publicSiteDir, "contact.html"));
});

app.get("/data-treatment", (req, res) => {
	res.sendFile(path.join(publicSiteDir, "data-treatment.html"));
});

app.get("/data-treatment-conditions", (req, res) => {
	res.sendFile(path.join(publicSiteDir, "data-treatment-conditions.html"));
});

app.use((error, req, res, next) => {
	if (error?.type === "entity.too.large") {
		return res.status(413).json({ message: "La imagen es demasiado pesada. Usa una de máximo 1 MB." });
	}

	return next(error);
});

initSocket(server);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
	console.log(`Servidor corriendo en puerto ${PORT}`);
});
