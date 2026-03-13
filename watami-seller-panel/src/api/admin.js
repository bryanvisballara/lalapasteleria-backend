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