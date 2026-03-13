const mongoose = require("mongoose");

const neighborhoodSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  deliveryFee: {
    type: Number,
    required: true,
    min: 0
  },
  active: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model("Neighborhood", neighborhoodSchema);
