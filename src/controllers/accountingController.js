const OperatingExpense = require("../models/OperatingExpense");
const {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS
} = require("../models/OperatingExpense");
const {
  parseMonthParam,
  getMonthRange,
  buildAccountingOverview
} = require("../services/accountingService");
const { parseCalendarDateInput } = require("../utils/calendarDate");

const normalizeExpensePayload = (body = {}) => {
  const expenseDate = parseCalendarDateInput(body.expenseDate);

  return {
    category: EXPENSE_CATEGORIES.includes(body.category) ? body.category : "otros",
    description: typeof body.description === "string" ? body.description.trim() : "",
    amount: Number(body.amount),
    expenseDate,
    paymentMethod: PAYMENT_METHODS.includes(body.paymentMethod) ? body.paymentMethod : "efectivo",
    vendor: typeof body.vendor === "string" ? body.vendor.trim() : "",
    notes: typeof body.notes === "string" ? body.notes.trim() : ""
  };
};

const listOperatingExpenses = async (req, res) => {
  try {
    const { year, month } = parseMonthParam(req.query.year, req.query.month);
    const { start, end } = getMonthRange(year, month);
    const category = typeof req.query.category === "string" ? req.query.category : "";

    const filter = {
      expenseDate: { $gte: start, $lte: end }
    };

    if (EXPENSE_CATEGORIES.includes(category)) {
      filter.category = category;
    }

    const expenses = await OperatingExpense.find(filter)
      .populate("createdBy", "firstName lastName")
      .sort({ expenseDate: -1, createdAt: -1 });

    return res.status(200).json(expenses);
  } catch (error) {
    return res.status(500).json({ message: "Error obteniendo gastos", error: error.message });
  }
};

const getAccountingOverview = async (req, res) => {
  try {
    const overview = await buildAccountingOverview(req.query.year, req.query.month);
    return res.status(200).json(overview);
  } catch (error) {
    return res.status(500).json({ message: "Error obteniendo resumen contable", error: error.message });
  }
};

const createOperatingExpense = async (req, res) => {
  try {
    const payload = normalizeExpensePayload(req.body);

    if (!payload.description) {
      return res.status(400).json({ message: "Describe en qué se gastó el dinero" });
    }

    if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
      return res.status(400).json({ message: "Ingresa un monto válido mayor a cero" });
    }

    const expense = await OperatingExpense.create({
      ...payload,
      createdBy: req.user?._id
    });

    await expense.populate("createdBy", "firstName lastName");
    return res.status(201).json(expense);
  } catch (error) {
    return res.status(500).json({ message: "Error registrando gasto", error: error.message });
  }
};

const updateOperatingExpense = async (req, res) => {
  try {
    const payload = normalizeExpensePayload(req.body);

    if (!payload.description) {
      return res.status(400).json({ message: "Describe en qué se gastó el dinero" });
    }

    if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
      return res.status(400).json({ message: "Ingresa un monto válido mayor a cero" });
    }

    const expense = await OperatingExpense.findByIdAndUpdate(
      req.params.id,
      payload,
      { new: true, runValidators: true }
    ).populate("createdBy", "firstName lastName");

    if (!expense) {
      return res.status(404).json({ message: "Gasto no encontrado" });
    }

    return res.status(200).json(expense);
  } catch (error) {
    return res.status(500).json({ message: "Error actualizando gasto", error: error.message });
  }
};

const deleteOperatingExpense = async (req, res) => {
  try {
    const expense = await OperatingExpense.findByIdAndDelete(req.params.id);

    if (!expense) {
      return res.status(404).json({ message: "Gasto no encontrado" });
    }

    return res.status(200).json({ message: "Gasto eliminado" });
  } catch (error) {
    return res.status(500).json({ message: "Error eliminando gasto", error: error.message });
  }
};

module.exports = {
  listOperatingExpenses,
  getAccountingOverview,
  createOperatingExpense,
  updateOperatingExpense,
  deleteOperatingExpense
};
