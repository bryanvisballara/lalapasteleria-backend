import api from "./http";

export const getCart = async () => {
  const { data } = await api.get("/cart");
  return data;
};

export const syncCart = async (items, mode = "merge") => {
  const { data } = await api.put("/cart", { items, mode });
  return data;
};

export const clearCart = async () => {
  const { data } = await api.delete("/cart");
  return data;
};
