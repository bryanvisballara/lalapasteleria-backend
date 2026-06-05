const mongoose = require("mongoose");

const UNITS = ["g", "kg", "ml", "L", "und"];

const ingredientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  unit: {
    type: String,
    enum: UNITS,
    default: "g"
  },
  costPerUnit: {
    type: Number,
    required: true,
    min: 0
  },
  notes: {
    type: String,
    trim: true,
    default: ""
  },
  active: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

ingredientSchema.index({ name: 1 });

module.exports = mongoose.model("Ingredient", ingredientSchema);
module.exports.INGREDIENT_UNITS = UNITS;
