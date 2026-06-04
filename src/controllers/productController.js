const Product = require("../models/Product");
const Category = require("../models/Category");

const normalizeSizesPayload = (payload = {}) => {
  const hasSizesFlag = payload.hasSizes === true || payload.hasSizes === "true";
  const rawSizes = Array.isArray(payload.sizes) ? payload.sizes : [];

  const sizes = rawSizes
    .map((size) => ({
      name: typeof size?.name === "string" ? size.name.trim() : "",
      price: Number(size?.price)
    }))
    .filter((size) => size.name && Number.isFinite(size.price) && size.price >= 0);

  const hasSizes = hasSizesFlag || sizes.length > 0;

  if (!hasSizes) {
    return { hasSizes: false, sizes: [] };
  }

  return { hasSizes: true, sizes };
};

const createProduct = async (req, res) => {
  try {
    const { category } = req.body;

    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({ message: "La categoría no existe" });
    }

    const payload = { ...req.body };
    const shouldNormalizeSizes = req.body.hasSizes !== undefined || req.body.sizes !== undefined;

    if (shouldNormalizeSizes) {
      const { hasSizes, sizes } = normalizeSizesPayload(req.body);
      if (hasSizes && sizes.length === 0) {
        return res.status(400).json({ message: "Debes agregar al menos un tamaño válido" });
      }

      const normalizedPrice = Number(req.body.price);
      const fallbackPrice = Number.isFinite(normalizedPrice) ? normalizedPrice : 0;

      payload.hasSizes = hasSizes;
      payload.sizes = sizes;
      payload.price = hasSizes ? sizes[0].price : fallbackPrice;
    }

    const product = await Product.create(payload);
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

    const payload = { ...req.body };
    const shouldNormalizeSizes = req.body.hasSizes !== undefined || req.body.sizes !== undefined;

    if (shouldNormalizeSizes) {
      const { hasSizes, sizes } = normalizeSizesPayload(req.body);
      if (hasSizes && sizes.length === 0) {
        return res.status(400).json({ message: "Debes agregar al menos un tamaño válido" });
      }

      const normalizedPrice = Number(req.body.price);
      const fallbackPrice = Number.isFinite(normalizedPrice) ? normalizedPrice : 0;

      payload.hasSizes = hasSizes;
      payload.sizes = sizes;
      payload.price = hasSizes ? sizes[0].price : fallbackPrice;
    }

    const product = await Product.findByIdAndUpdate(req.params.id, payload, {
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
