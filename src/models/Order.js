const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  address: {
    street: {
      type: String,
      required: true
    },
    neighborhood: {
      type: String,
      required: true
    }
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
      },
      quantity: {
        type: Number,
        required: true
      },
      price: {
        type: Number,
        required: true
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
      },
      extras: [
        {
          product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
          },
          price: {
            type: Number,
            required: true
          }
        }
      ]
    }
  ],
  subtotal: {
    type: Number,
    required: true
  },
  deliveryFee: {
    type: Number,
    required: true
  },
  total: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ["card", "cash", "pse"],
    required: true
  },
  customerComment: {
    type: String,
    default: "",
    trim: true,
    maxlength: 500
  },
  cashPaymentAmount: {
    type: String,
    default: "",
    trim: true,
    maxlength: 60
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid"],
    default: "pending"
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "preparing", "ready", "on_the_way", "delivered", "cancelled"],
    default: "pending"
  }
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
