const UNIT_TO_BASE = {
  g: { base: "g", factor: 1 },
  kg: { base: "g", factor: 1000 },
  ml: { base: "ml", factor: 1 },
  L: { base: "ml", factor: 1000 },
  und: { base: "und", factor: 1 }
};

const convertQuantity = (quantity, fromUnit, toUnit) => {
  const from = UNIT_TO_BASE[fromUnit];
  const to = UNIT_TO_BASE[toUnit];

  if (!from || !to || from.base !== to.base) {
    return null;
  }

  return (Number(quantity) * from.factor) / to.factor;
};

const calculateLineCost = (ingredient, quantity) => {
  if (!ingredient || !Number.isFinite(Number(quantity))) {
    return 0;
  }

  const qty = Number(quantity);
  const converted = convertQuantity(qty, ingredient.unit, ingredient.unit);

  if (converted === null) {
    return 0;
  }

  return converted * Number(ingredient.costPerUnit || 0);
};

const enrichRecipe = (recipeDoc) => {
  const recipe = recipeDoc.toObject ? recipeDoc.toObject() : { ...recipeDoc };
  let ingredientsCost = 0;

  recipe.lines = (recipe.lines || []).map((line) => {
    const ingredient = line.ingredient;
    const lineCost = calculateLineCost(ingredient, line.quantity);
    ingredientsCost += lineCost;

    return {
      ...line,
      lineCost: Number(lineCost.toFixed(2))
    };
  });

  const extraCosts = Number(recipe.extraCosts || 0);
  const totalCost = Number((ingredientsCost + extraCosts).toFixed(2));
  const suggestedSalePrice = Number(recipe.suggestedSalePrice || 0);
  const estimatedProfit = Number((suggestedSalePrice - totalCost).toFixed(2));
  const marginPercent = suggestedSalePrice > 0
    ? Number(((estimatedProfit / suggestedSalePrice) * 100).toFixed(1))
    : 0;

  return {
    ...recipe,
    ingredientsCost: Number(ingredientsCost.toFixed(2)),
    totalCost,
    estimatedProfit,
    marginPercent
  };
};

const calculateSaleTotals = (sale) => {
  const items = sale.items || [];
  let totalSale = 0;
  let totalCost = 0;

  items.forEach((item) => {
    const qty = Number(item.quantity || 0);
    totalSale += qty * Number(item.unitSalePrice || 0);
    totalCost += qty * Number(item.unitCost || 0);
  });

  const additionalCosts = Number(sale.additionalCosts || 0);
  totalCost += additionalCosts;
  const profit = totalSale - totalCost;

  return {
    totalSale: Number(totalSale.toFixed(2)),
    totalCost: Number(totalCost.toFixed(2)),
    profit: Number(profit.toFixed(2))
  };
};

module.exports = {
  calculateLineCost,
  enrichRecipe,
  calculateSaleTotals
};
