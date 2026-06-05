const mongoose = require("mongoose");

const EXPENSE_CATEGORIES = [
  "nomina",
  "servicios",
  "arriendo",
  "domicilios",
  "insumos",
  "marketing",
  "mantenimiento",
  "impuestos",
  "imprevistos",
  "otros"
];

const PAYMENT_METHODS = ["efectivo", "transferencia", "tarjeta", "otro"];

const operatingExpenseSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: EXPENSE_CATEGORIES,
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  expenseDate: {
    type: Date,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: PAYMENT_METHODS,
    default: "efectivo"
  },
  vendor: {
    type: String,
    trim: true,
    default: ""
  },
  notes: {
    type: String,
    trim: true,
    default: ""
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }
}, { timestamps: true });

operatingExpenseSchema.index({ expenseDate: -1 });
operatingExpenseSchema.index({ category: 1, expenseDate: -1 });

module.exports = mongoose.model("OperatingExpense", operatingExpenseSchema);
module.exports.EXPENSE_CATEGORIES = EXPENSE_CATEGORIES;
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;
