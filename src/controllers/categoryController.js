const Category = require("../models/Category");

const createCategory = async (req, res) => {
  try {
    const lastCategory = await Category.findOne().sort({ sortOrder: -1, createdAt: -1 });
    const nextSortOrder = Number.isFinite(lastCategory?.sortOrder) ? lastCategory.sortOrder + 1 : 0;

    const category = await Category.create({
      ...req.body,
      sortOrder: req.body.sortOrder ?? nextSortOrder
    });
    return res.status(201).json(category);
  } catch (error) {
    return res.status(500).json({ message: "Error creando categoría", error: error.message });
  }
};

const getCategories = async (req, res) => {
  try {
    const filter = {};

    if (req.query.active === "true") {
      filter.active = true;
    }

    if (req.query.active === "false") {
      filter.active = false;
    }

    const categories = await Category.find(filter).sort({ sortOrder: 1, createdAt: -1 });
    return res.status(200).json(categories);
  } catch (error) {
    return res.status(500).json({ message: "Error obteniendo categorías", error: error.message });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: "Categoría no encontrada" });
    }

    return res.status(200).json(category);
  } catch (error) {
    return res.status(500).json({ message: "Error obteniendo categoría", error: error.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!category) {
      return res.status(404).json({ message: "Categoría no encontrada" });
    }

    return res.status(200).json(category);
  } catch (error) {
    return res.status(500).json({ message: "Error actualizando categoría", error: error.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({ message: "Categoría no encontrada" });
    }

    return res.status(200).json({ message: "Categoría eliminada" });
  } catch (error) {
    return res.status(500).json({ message: "Error eliminando categoría", error: error.message });
  }
};

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory
};
