const mongoose = require("mongoose");

const productSizeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  price: {
    type: Number,
    required: true
  },
  image: String,
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true
  },
  available: {
    type: Boolean,
    default: true
  },
  hasSizes: {
    type: Boolean,
    default: false
  },
  sizes: {
    type: [productSizeSchema],
    default: []
  }
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);
