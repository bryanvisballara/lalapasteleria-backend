const InternalSale = require("../models/InternalSale");
const Order = require("../models/Order");
const OperatingExpense = require("../models/OperatingExpense");
const { calculateSaleTotals } = require("./recipeCostService");

const roundMoney = (value) => Number(Number(value || 0).toFixed(2));

const parseMonthParam = (yearRaw, monthRaw) => {
  const now = new Date();
  const year = Number(yearRaw) || now.getFullYear();
  const month = Number(monthRaw) || now.getMonth() + 1;

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1
    };
  }

  return { year, month };
};

const getMonthRange = (year, month) => {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  return { start, end };
};

const buildCategoryTotals = (expenses = []) => {
  return expenses.reduce((accumulator, expense) => {
    const category = expense.category || "otros";
    accumulator[category] = roundMoney((accumulator[category] || 0) + Number(expense.amount || 0));
    return accumulator;
  }, {});
};

const buildAccountingOverview = async (yearRaw, monthRaw) => {
  const { year, month } = parseMonthParam(yearRaw, monthRaw);
  const { start, end } = getMonthRange(year, month);

  const [internalSales, appOrders, operatingExpenses] = await Promise.all([
    InternalSale.find({ saleDate: { $gte: start, $lte: end } }),
    Order.find({
      status: "delivered",
      createdAt: { $gte: start, $lte: end }
    }),
    OperatingExpense.find({ expenseDate: { $gte: start, $lte: end } }).sort({ expenseDate: -1 })
  ]);

  let internalSalesTotal = 0;
  let productionCosts = 0;

  internalSales.forEach((sale) => {
    const totals = calculateSaleTotals(sale);
    internalSalesTotal += totals.totalSale;
    productionCosts += totals.totalCost;
  });

  const appSalesTotal = appOrders.reduce((accumulator, order) => accumulator + Number(order.total || 0), 0);
  const operatingExpensesTotal = operatingExpenses.reduce(
    (accumulator, expense) => accumulator + Number(expense.amount || 0),
    0
  );

  const totalIncome = internalSalesTotal + appSalesTotal;
  const totalExpenses = productionCosts + operatingExpensesTotal;
  const netResult = totalIncome - totalExpenses;

  return {
    period: {
      year,
      month,
      label: start.toLocaleDateString("es-CO", { month: "long", year: "numeric" })
    },
    income: {
      total: roundMoney(totalIncome),
      appSales: roundMoney(appSalesTotal),
      internalSales: roundMoney(internalSalesTotal),
      appOrdersCount: appOrders.length,
      internalSalesCount: internalSales.length
    },
    costs: {
      production: roundMoney(productionCosts),
      operating: roundMoney(operatingExpensesTotal),
      total: roundMoney(totalExpenses)
    },
    result: {
      net: roundMoney(netResult),
      marginPercent: totalIncome > 0 ? roundMoney((netResult / totalIncome) * 100) : 0
    },
    operatingExpensesByCategory: buildCategoryTotals(operatingExpenses),
    recentOperatingExpenses: operatingExpenses.slice(0, 8)
  };
};

module.exports = {
  parseMonthParam,
  getMonthRange,
  buildAccountingOverview
};
