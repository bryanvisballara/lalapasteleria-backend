require("dotenv").config();
const dns = require("dns");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Category = require("../models/Category");
const Product = require("../models/Product");
const Neighborhood = require("../models/Neighborhood");
const Order = require("../models/Order");
const FcmToken = require("../models/FcmToken");
const Cart = require("../models/Cart");

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const seed = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI no está definido en .env");
  }

  await mongoose.connect(process.env.MONGO_URI);

  await Promise.all([
    Order.deleteMany({}),
    Cart.deleteMany({}),
    FcmToken.deleteMany({}),
    Product.deleteMany({}),
    Category.deleteMany({}),
    Neighborhood.deleteMany({}),
    User.deleteMany({})
  ]);

  const adminPassword = await bcrypt.hash("Admin123*", 10);
  const sellerPassword = await bcrypt.hash("Seller123*", 10);

  const [adminUser, sellerUser] = await User.create([
    {
      firstName: "Admin",
      lastName: "Lala",
      email: "admin@lalapasteleria.com",
      phone: "3001000001",
      password: adminPassword,
      role: "admin",
      addresses: [
        {
          label: "Oficina",
          street: "Cra 10 #20-30",
          neighborhood: "Centro",
          details: "Piso 2"
        }
      ]
    },
    {
      firstName: "Seller",
      lastName: "Lala",
      email: "seller@lalapasteleria.com",
      phone: "3001000002",
      password: sellerPassword,
      role: "seller",
      addresses: [
        {
          label: "Trabajo",
          street: "Calle 8 #15-22",
          neighborhood: "San Fernando",
          details: "Cocina principal"
        }
      ]
    }
  ]);

  const categories = await Category.insertMany([
    { name: "Sushi Rolls", image: "", active: true },
    { name: "Entradas", image: "", active: true },
    { name: "Bebidas", image: "", active: true },
    { name: "Combos", image: "", active: true },
    { name: "Postres", image: "", active: true }
  ]);

  const categoriesByName = categories.reduce((accumulator, category) => {
    accumulator[category.name] = category._id;
    return accumulator;
  }, {});

  const neighborhoods = await Neighborhood.insertMany([
    { name: "Alto Prado", deliveryFee: 5000, active: true },
    { name: "Andalucía", deliveryFee: 5000, active: true },
    { name: "Barrio Abajo", deliveryFee: 5000, active: true },
    { name: "Bellavista", deliveryFee: 5000, active: true },
    { name: "Betania", deliveryFee: 5000, active: true },
    { name: "Boston", deliveryFee: 5000, active: true },
    { name: "Buenavista", deliveryFee: 5000, active: true },
    { name: "Caribe Verde", deliveryFee: 5000, active: true },
    { name: "Carrizal", deliveryFee: 5000, active: true },
    { name: "Centro", deliveryFee: 5000, active: true },
    { name: "Chiquinquirá", deliveryFee: 5000, active: true },
    { name: "Ciudad Jardín", deliveryFee: 5000, active: true },
    { name: "Ciudadela 20 de Julio", deliveryFee: 5000, active: true },
    { name: "El Bosque", deliveryFee: 5000, active: true },
    { name: "El Ferry", deliveryFee: 5000, active: true },
    { name: "El Golf", deliveryFee: 5000, active: true },
    { name: "El Parque", deliveryFee: 5000, active: true },
    { name: "El Prado", deliveryFee: 5000, active: true },
    { name: "El Pueblito", deliveryFee: 5000, active: true },
    { name: "El Silencio", deliveryFee: 5000, active: true },
    { name: "Evaristo Sourdís", deliveryFee: 5000, active: true },
    { name: "Granadillo", deliveryFee: 5000, active: true },
    { name: "La Castellana", deliveryFee: 5000, active: true },
    { name: "La Ceiba", deliveryFee: 5000, active: true },
    { name: "La Chinita", deliveryFee: 5000, active: true },
    { name: "La Esmeralda", deliveryFee: 5000, active: true },
    { name: "La Luz", deliveryFee: 5000, active: true },
    { name: "La Manga", deliveryFee: 5000, active: true },
    { name: "La Paz", deliveryFee: 5000, active: true },
    { name: "La Pradera", deliveryFee: 5000, active: true },
    { name: "La Sierrita", deliveryFee: 5000, active: true },
    { name: "La Victoria", deliveryFee: 5000, active: true },
    { name: "Las Delicias", deliveryFee: 5000, active: true },
    { name: "Las Estrellas", deliveryFee: 5000, active: true },
    { name: "Las Malvinas", deliveryFee: 5000, active: true },
    { name: "Las Nieves", deliveryFee: 5000, active: true },
    { name: "Lipaya", deliveryFee: 5000, active: true },
    { name: "Los Andes", deliveryFee: 5000, active: true },
    { name: "Los Nogales", deliveryFee: 5000, active: true },
    { name: "Los Olivos", deliveryFee: 5000, active: true },
    { name: "Los Trupillos", deliveryFee: 5000, active: true },
    { name: "Me Quejo", deliveryFee: 5000, active: true },
    { name: "Metropolitana", deliveryFee: 5000, active: true },
    { name: "Miramar", deliveryFee: 5000, active: true },
    { name: "Montecristo", deliveryFee: 5000, active: true },
    { name: "Nueva Granada", deliveryFee: 5000, active: true },
    { name: "Olaya", deliveryFee: 5000, active: true },
    { name: "Paraíso", deliveryFee: 5000, active: true },
    { name: "Rebolo", deliveryFee: 5000, active: true },
    { name: "Recreo", deliveryFee: 5000, active: true },
    { name: "Riomar", deliveryFee: 5000, active: true },
    { name: "Rosario", deliveryFee: 5000, active: true },
    { name: "San Felipe", deliveryFee: 5000, active: true },
    { name: "San Isidro", deliveryFee: 5000, active: true },
    { name: "San José", deliveryFee: 5000, active: true },
    { name: "San Nicolás", deliveryFee: 5000, active: true },
    { name: "San Roque", deliveryFee: 5000, active: true },
    { name: "San Vicente", deliveryFee: 5000, active: true },
    { name: "Santa Mónica", deliveryFee: 5000, active: true },
    { name: "Santo Domingo", deliveryFee: 5000, active: true },
    { name: "Siete de Abril", deliveryFee: 5000, active: true },
    { name: "Simón Bolívar", deliveryFee: 5000, active: true },
    { name: "Villa Blanca", deliveryFee: 5000, active: true },
    { name: "Villa Carolina", deliveryFee: 5000, active: true },
    { name: "Villa del Rosario", deliveryFee: 5000, active: true },
    { name: "Villa Santos", deliveryFee: 5000, active: true },
    { name: "Villate", deliveryFee: 5000, active: true }
  ]);

  const products = await Product.insertMany([
    {
      name: "California Roll",
      description: "Cangrejo, aguacate y pepino",
      price: 22000,
      image: "",
      category: categoriesByName["Sushi Rolls"],
      available: true
    },
    {
      name: "Philadelphia Roll",
      description: "Salmón, queso crema y pepino",
      price: 24000,
      image: "",
      category: categoriesByName["Sushi Rolls"],
      available: true
    },
    {
      name: "Tempura Roll",
      description: "Roll crocante con camarón tempura",
      price: 26000,
      image: "",
      category: categoriesByName["Sushi Rolls"],
      available: true
    },
    {
      name: "Gyozas",
      description: "Empanaditas japonesas de cerdo",
      price: 14000,
      image: "",
      category: categoriesByName["Entradas"],
      available: true
    },
    {
      name: "Ebi Tempura",
      description: "Camarones apanados estilo japonés",
      price: 19000,
      image: "",
      category: categoriesByName["Entradas"],
      available: true
    },
    {
      name: "Limonada de Coco",
      description: "Bebida fría cremosa",
      price: 9000,
      image: "",
      category: categoriesByName["Bebidas"],
      available: true
    },
    {
      name: "Té Helado",
      description: "Té negro con limón",
      price: 7000,
      image: "",
      category: categoriesByName["Bebidas"],
      available: true
    },
    {
      name: "Combo Lala 2",
      description: "2 rolls + 2 bebidas",
      price: 52000,
      image: "",
      category: categoriesByName["Combos"],
      available: true
    },
    {
      name: "Combo Familiar 4",
      description: "4 rolls + 4 bebidas + entrada",
      price: 99000,
      image: "",
      category: categoriesByName["Combos"],
      available: true
    },
    {
      name: "Mochi Helado",
      description: "Postre japonés relleno de helado",
      price: 12000,
      image: "",
      category: categoriesByName["Postres"],
      available: true
    }
  ]);

  console.log("✅ Seed completado");
  console.log(`Usuarios creados: 2 (${adminUser.email}, ${sellerUser.email})`);
  console.log(`Categorías creadas: ${categories.length}`);
  console.log(`Barrios creados: ${neighborhoods.length}`);
  console.log(`Productos creados: ${products.length}`);
  console.log("Credenciales seed:");
  console.log("- admin@lalapasteleria.com / Admin123*");
  console.log("- seller@lalapasteleria.com / Seller123*");
};

seed()
  .catch((error) => {
    console.error("❌ Error ejecutando seed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
