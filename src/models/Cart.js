const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    extras: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product"
        }
      ],
      default: []
    },
    selectedSize: {
      type: {
        name: {
          type: String,
          trim: true
        },
        price: {
          type: Number,
          min: 0
        }
      },
      default: null
    }
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    items: {
      type: [cartItemSchema],
      default: []
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cart", cartSchema);
