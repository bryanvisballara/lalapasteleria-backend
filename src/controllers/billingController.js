const InternalSale = require("../models/InternalSale");
const { calculateSaleTotals } = require("../services/recipeCostService");

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (value) => {
  const date = startOfDay(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

const parseDateParam = (raw) => {
  if (!raw) {
    return startOfDay(new Date());
  }

  const match = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return startOfDay(new Date());
  }

  return startOfDay(new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
};

const enrichSale = (saleDoc) => {
  const sale = saleDoc.toObject ? saleDoc.toObject() : { ...saleDoc };
  const totals = calculateSaleTotals(sale);

  return {
    ...sale,
    ...totals
  };
};

const normalizeItems = (items = []) => {
  return (Array.isArray(items) ? items : [])
    .map((item) => ({
      description: typeof item.description === "string" ? item.description.trim() : "",
      quantity: Number(item.quantity),
      unitSalePrice: Number(item.unitSalePrice),
      unitCost: Number(item.unitCost) || 0
    }))
    .filter((item) => item.description && Number.isFinite(item.quantity) && item.quantity > 0);
};

const listInternalSales = async (req, res) => {
  try {
    const day = parseDateParam(req.query.date);
    const sales = await InternalSale.find({
      saleDate: { $gte: day, $lte: endOfDay(day) }
    })
      .populate("createdBy", "firstName lastName")
      .sort({ createdAt: -1 });

    return res.status(200).json(sales.map((sale) => enrichSale(sale)));
  } catch (error) {
    return res.status(500).json({ message: "Error obteniendo ventas", error: error.message });
  }
};

const getDailySummary = async (req, res) => {
  try {
    const day = parseDateParam(req.query.date);
    const sales = await InternalSale.find({
      saleDate: { $gte: day, $lte: endOfDay(day) }
    });

    const summary = sales.reduce(
      (accumulator, sale) => {
        const totals = calculateSaleTotals(sale);
        accumulator.salesCount += 1;
        accumulator.totalSale += totals.totalSale;
        accumulator.totalCost += totals.totalCost;
        accumulator.profit += totals.profit;
        return accumulator;
      },
      { salesCount: 0, totalSale: 0, totalCost: 0, profit: 0 }
    );

    return res.status(200).json({
      date: day,
      salesCount: summary.salesCount,
      totalSale: Number(summary.totalSale.toFixed(2)),
      totalCost: Number(summary.totalCost.toFixed(2)),
      profit: Number(summary.profit.toFixed(2))
    });
  } catch (error) {
    return res.status(500).json({ message: "Error obteniendo resumen del día", error: error.message });
  }
};

const createInternalSale = async (req, res) => {
  try {
    const items = normalizeItems(req.body.items);

    if (!items.length) {
      return res.status(400).json({ message: "Agrega al menos un producto a la factura" });
    }

    const saleDate = req.body.saleDate
      ? parseDateParam(req.body.saleDate)
      : startOfDay(new Date());

    const sale = await InternalSale.create({
      saleDate,
      customerName: req.body.customerName || "",
      items,
      additionalCosts: Number(req.body.additionalCosts) || 0,
      notes: req.body.notes || "",
      createdBy: req.user?._id
    });

    await sale.populate("createdBy", "firstName lastName");
    return res.status(201).json(enrichSale(sale));
  } catch (error) {
    return res.status(500).json({ message: "Error registrando venta", error: error.message });
  }
};

const deleteInternalSale = async (req, res) => {
  try {
    const sale = await InternalSale.findByIdAndDelete(req.params.id);

    if (!sale) {
      return res.status(404).json({ message: "Venta no encontrada" });
    }

    return res.status(200).json({ message: "Venta eliminada" });
  } catch (error) {
    return res.status(500).json({ message: "Error eliminando venta", error: error.message });
  }
};

module.exports = {
  listInternalSales,
  getDailySummary,
  createInternalSale,
  deleteInternalSale
};
