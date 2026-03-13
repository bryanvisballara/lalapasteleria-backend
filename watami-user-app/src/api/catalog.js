import api from "./http";

export const getCategories = async () => {
  const { data } = await api.get("/categories", { params: { active: true } });
  return data;
};

export const getProducts = async () => {
  const { data } = await api.get("/products", { params: { available: true } });
  return data;
};

export const getNeighborhoods = async () => {
  const { data } = await api.get("/neighborhoods", { params: { active: true } });
  return data;
};

export const getPublicConfig = async () => {
  const { data } = await api.get("/admin/public-config");
  return data;
};
