import api from "./http";

export const createOrder = async (payload) => {
  const { data } = await api.post("/orders", payload);
  return data;
};

export const getMyOrders = async () => {
  const { data } = await api.get("/orders/my");
  return data;
};
