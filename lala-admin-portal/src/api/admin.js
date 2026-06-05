import api from "./http";

export const getCategories = async () => {
  const { data } = await api.get("/categories");
  return data;
};

export const createCategory = async (payload) => {
  const { data } = await api.post("/categories", payload);
  return data;
};

export const updateCategory = async (id, payload) => {
  const { data } = await api.put(`/categories/${id}`, payload);
  return data;
};

export const deleteCategory = async (id) => {
  const { data } = await api.delete(`/categories/${id}`);
  return data;
};

export const getProducts = async () => {
  const { data } = await api.get("/products");
  return data;
};

export const createProduct = async (payload) => {
  const { data } = await api.post("/products", payload);
  return data;
};

export const updateProduct = async (id, payload) => {
  const { data } = await api.put(`/products/${id}`, payload);
  return data;
};

export const deleteProduct = async (id) => {
  const { data } = await api.delete(`/products/${id}`);
  return data;
};

export const getNeighborhoods = async () => {
  const { data } = await api.get("/neighborhoods");
  return data;
};

export const createNeighborhood = async (payload) => {
  const { data } = await api.post("/neighborhoods", payload);
  return data;
};

export const updateNeighborhood = async (id, payload) => {
  const { data } = await api.put(`/neighborhoods/${id}`, payload);
  return data;
};

export const deleteNeighborhood = async (id) => {
  const { data } = await api.delete(`/neighborhoods/${id}`);
  return data;
};

export const getRestaurantConfig = async () => {
  const { data } = await api.get("/admin/restaurant-config");
  return data;
};

export const updateRestaurantConfig = async (payload) => {
  const { data } = await api.put("/admin/restaurant-config", payload);
  return data;
};

export const sendPushCampaign = async (payload) => {
  const { data } = await api.post("/admin/marketing/push", payload);
  return data;
};

export const getCustomerInquiries = async () => {
  const { data } = await api.get("/admin/customer-inquiries");
  return data;
};

export const createCustomerInquiry = async (payload) => {
  const { data } = await api.post("/admin/customer-inquiries", payload);
  return data;
};

export const updateCustomerInquiry = async (id, payload) => {
  const { data } = await api.put(`/admin/customer-inquiries/${id}`, payload);
  return data;
};

export const deleteCustomerInquiry = async (id) => {
  const { data } = await api.delete(`/admin/customer-inquiries/${id}`);
  return data;
};

export const getImpulsaInteractions = async (referenceDate) => {
  const { data } = await api.get("/admin/impulsa", {
    params: referenceDate ? { referenceDate } : undefined
  });
  return data;
};

export const markImpulsaContacted = async (id) => {
  const { data } = await api.post(`/admin/customer-inquiries/${id}/impulsa-contacted`);
  return data;
};

export const getIngredients = async () => {
  const { data } = await api.get("/admin/ingredients");
  return data;
};

export const createIngredient = async (payload) => {
  const { data } = await api.post("/admin/ingredients", payload);
  return data;
};

export const updateIngredient = async (id, payload) => {
  const { data } = await api.put(`/admin/ingredients/${id}`, payload);
  return data;
};

export const deleteIngredient = async (id) => {
  const { data } = await api.delete(`/admin/ingredients/${id}`);
  return data;
};

export const getRecipes = async () => {
  const { data } = await api.get("/admin/recipes");
  return data;
};

export const createRecipe = async (payload) => {
  const { data } = await api.post("/admin/recipes", payload);
  return data;
};

export const updateRecipe = async (id, payload) => {
  const { data } = await api.put(`/admin/recipes/${id}`, payload);
  return data;
};

export const deleteRecipe = async (id) => {
  const { data } = await api.delete(`/admin/recipes/${id}`);
  return data;
};

export const getBillingSales = async (date) => {
  const { data } = await api.get("/admin/billing/sales", {
    params: date ? { date } : undefined
  });
  return data;
};

export const getBillingSummary = async (date) => {
  const { data } = await api.get("/admin/billing/summary", {
    params: date ? { date } : undefined
  });
  return data;
};

export const createBillingSale = async (payload) => {
  const { data } = await api.post("/admin/billing/sales", payload);
  return data;
};

export const deleteBillingSale = async (id) => {
  const { data } = await api.delete(`/admin/billing/sales/${id}`);
  return data;
};

export const getAccountingOverview = async ({ year, month }) => {
  const { data } = await api.get("/admin/accounting/overview", {
    params: { year, month }
  });
  return data;
};

export const getOperatingExpenses = async ({ year, month, category }) => {
  const { data } = await api.get("/admin/accounting/expenses", {
    params: { year, month, category: category || undefined }
  });
  return data;
};

export const createOperatingExpense = async (payload) => {
  const { data } = await api.post("/admin/accounting/expenses", payload);
  return data;
};

export const updateOperatingExpense = async (id, payload) => {
  const { data } = await api.put(`/admin/accounting/expenses/${id}`, payload);
  return data;
};

export const deleteOperatingExpense = async (id) => {
  const { data } = await api.delete(`/admin/accounting/expenses/${id}`);
  return data;
};