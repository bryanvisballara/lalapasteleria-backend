const Recipe = require("../models/Recipe");
const { enrichRecipe } = require("../services/recipeCostService");

const populateRecipe = { path: "lines.ingredient" };

const normalizeLines = (lines = []) => {
  return (Array.isArray(lines) ? lines : [])
    .map((line) => ({
      ingredient: line.ingredient || line.ingredientId,
      quantity: Number(line.quantity)
    }))
    .filter((line) => line.ingredient && Number.isFinite(line.quantity) && line.quantity > 0);
};

const listRecipes = async (req, res) => {
  try {
    const recipes = await Recipe.find().populate(populateRecipe).sort({ name: 1 });
    return res.status(200).json(recipes.map((recipe) => enrichRecipe(recipe)));
  } catch (error) {
    return res.status(500).json({ message: "Error obteniendo recetas", error: error.message });
  }
};

const createRecipe = async (req, res) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const lines = normalizeLines(req.body.lines);

    if (!name) {
      return res.status(400).json({ message: "El nombre de la receta es obligatorio" });
    }

    if (!lines.length) {
      return res.status(400).json({ message: "Agrega al menos un insumo a la receta" });
    }

    const recipe = await Recipe.create({
      name,
      yieldLabel: req.body.yieldLabel || "",
      lines,
      extraCosts: Number(req.body.extraCosts) || 0,
      suggestedSalePrice: Number(req.body.suggestedSalePrice) || 0,
      notes: req.body.notes || ""
    });

    await recipe.populate(populateRecipe);
    return res.status(201).json(enrichRecipe(recipe));
  } catch (error) {
    return res.status(500).json({ message: "Error creando receta", error: error.message });
  }
};

const updateRecipe = async (req, res) => {
  try {
    const payload = { ...req.body };

    if (req.body.lines) {
      payload.lines = normalizeLines(req.body.lines);
    }

    const recipe = await Recipe.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true
    }).populate(populateRecipe);

    if (!recipe) {
      return res.status(404).json({ message: "Receta no encontrada" });
    }

    return res.status(200).json(enrichRecipe(recipe));
  } catch (error) {
    return res.status(500).json({ message: "Error actualizando receta", error: error.message });
  }
};

const deleteRecipe = async (req, res) => {
  try {
    const recipe = await Recipe.findByIdAndDelete(req.params.id);

    if (!recipe) {
      return res.status(404).json({ message: "Receta no encontrada" });
    }

    return res.status(200).json({ message: "Receta eliminada" });
  } catch (error) {
    return res.status(500).json({ message: "Error eliminando receta", error: error.message });
  }
};

module.exports = {
  listRecipes,
  createRecipe,
  updateRecipe,
  deleteRecipe
};
