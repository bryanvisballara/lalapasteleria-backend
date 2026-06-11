const InternalSale = require("../models/InternalSale");
const Order = require("../models/Order");
const OperatingExpense = require("../models/OperatingExpense");
const { calculateSaleTotals } = require("./recipeCostService");
const { getColombiaYearMonth, getMonthRangeInColombia } = require("../utils/calendarDate");

const roundMoney = (value) => Number(Number(value || 0).toFixed(2));

const parseMonthParam = (yearRaw, monthRaw) => {
  const colombiaNow = getColombiaYearMonth();
  const year = Number(yearRaw) || colombiaNow.year;
  const month = Number(monthRaw) || colombiaNow.month;

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return colombiaNow;
  }

  return { year, month };
};

const getMonthRange = (year, month) => getMonthRangeInColombia(year, month);

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
