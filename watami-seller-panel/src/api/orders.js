import api from "./http";

export const getOrders = async () => {
  const { data } = await api.get("/orders");
  return data;
};

export const patchOrderStatus = async (orderId, status) => {
  const { data } = await api.patch(`/orders/${orderId}/status`, { status });
  return data;
};
