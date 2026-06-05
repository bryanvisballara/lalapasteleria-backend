const mongoose = require("mongoose");

const recipeLineSchema = new mongoose.Schema({
  ingredient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Ingredient",
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const recipeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  yieldLabel: {
    type: String,
    trim: true,
    default: ""
  },
  lines: {
    type: [recipeLineSchema],
    default: []
  },
  extraCosts: {
    type: Number,
    default: 0,
    min: 0
  },
  suggestedSalePrice: {
    type: Number,
    default: 0,
    min: 0
  },
  notes: {
    type: String,
    trim: true,
    default: ""
  }
}, { timestamps: true });

recipeSchema.index({ name: 1 });

module.exports = mongoose.model("Recipe", recipeSchema);
