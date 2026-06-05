const Ingredient = require("../models/Ingredient");

const listIngredients = async (req, res) => {
  try {
    const ingredients = await Ingredient.find().sort({ name: 1 });
    return res.status(200).json(ingredients);
  } catch (error) {
    return res.status(500).json({ message: "Error obteniendo insumos", error: error.message });
  }
};

const createIngredient = async (req, res) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";

    if (!name) {
      return res.status(400).json({ message: "El nombre del insumo es obligatorio" });
    }

    const ingredient = await Ingredient.create({
      name,
      unit: req.body.unit || "g",
      costPerUnit: Number(req.body.costPerUnit) || 0,
      notes: req.body.notes || "",
      active: req.body.active !== false
    });

    return res.status(201).json(ingredient);
  } catch (error) {
    return res.status(500).json({ message: "Error creando insumo", error: error.message });
  }
};

const updateIngredient = async (req, res) => {
  try {
    const ingredient = await Ingredient.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!ingredient) {
      return res.status(404).json({ message: "Insumo no encontrado" });
    }

    return res.status(200).json(ingredient);
  } catch (error) {
    return res.status(500).json({ message: "Error actualizando insumo", error: error.message });
  }
};

const deleteIngredient = async (req, res) => {
  try {
    const ingredient = await Ingredient.findByIdAndDelete(req.params.id);

    if (!ingredient) {
      return res.status(404).json({ message: "Insumo no encontrado" });
    }

    return res.status(200).json({ message: "Insumo eliminado" });
  } catch (error) {
    return res.status(500).json({ message: "Error eliminando insumo", error: error.message });
  }
};

module.exports = {
  listIngredients,
  createIngredient,
  updateIngredient,
  deleteIngredient
};
