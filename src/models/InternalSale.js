const mongoose = require("mongoose");

const saleItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0.01
  },
  unitSalePrice: {
    type: Number,
    required: true,
    min: 0
  },
  unitCost: {
    type: Number,
    default: 0,
    min: 0
  }
}, { _id: false });

const internalSaleSchema = new mongoose.Schema({
  saleDate: {
    type: Date,
    required: true
  },
  customerName: {
    type: String,
    trim: true,
    default: ""
  },
  items: {
    type: [saleItemSchema],
    validate: {
      validator: (items) => Array.isArray(items) && items.length > 0,
      message: "Debe incluir al menos un ítem"
    }
  },
  additionalCosts: {
    type: Number,
    default: 0,
    min: 0
  },
  notes: {
    type: String,
    trim: true,
    default: ""
  },
  inspirationImage: {
    fileName: {
      type: String,
      trim: true,
      default: ""
    },
    mimeType: {
      type: String,
      trim: true,
      default: ""
    },
    data: {
      type: String,
      default: ""
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }
}, { timestamps: true });

internalSaleSchema.index({ saleDate: -1 });

module.exports = mongoose.model("InternalSale", internalSaleSchema);
