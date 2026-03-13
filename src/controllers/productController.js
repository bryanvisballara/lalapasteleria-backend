const Product = require("../models/Product");
const Category = require("../models/Category");

const createProduct = async (req, res) => {
  try {
    const { category } = req.body;

    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({ message: "La categoría no existe" });
    }

    const product = await Product.create(req.body);
    return res.status(201).json(product);
  } catch (error) {
    return res.status(500).json({ message: "Error creando producto", error: error.message });
  }
};

const getProducts = async (req, res) => {
  try {
    const filter = {};

    if (req.query.available === "true") {
      filter.available = true;
    }

    if (req.query.available === "false") {
      filter.available = false;
    }

    if (req.query.category) {
      filter.category = req.query.category;
    }

    const products = await Product.find(filter)
      .populate("category")
      .sort({ createdAt: -1 });

    return res.status(200).json(products);
  } catch (error) {
    return res.status(500).json({ message: "Error obteniendo productos", error: error.message });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category");

    if (!product) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    return res.status(200).json(product);
  } catch (error) {
    return res.status(500).json({ message: "Error obteniendo producto", error: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    if (req.body.category) {
      const categoryExists = await Category.findById(req.body.category);
      if (!categoryExists) {
        return res.status(400).json({ message: "La categoría no existe" });
      }
    }

    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate("category");

    if (!product) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    return res.status(200).json(product);
  } catch (error) {
    return res.status(500).json({ message: "Error actualizando producto", error: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    return res.status(200).json({ message: "Producto eliminado" });
  } catch (error) {
    return res.status(500).json({ message: "Error eliminando producto", error: error.message });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct
};
