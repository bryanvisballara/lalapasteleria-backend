import api from "./http";

export const register = async (payload) => {
  const { data } = await api.post("/auth/register", payload);
  return data;
};

export const login = async (payload) => {
  const { data } = await api.post("/auth/login", payload);
  return data;
};

export const googleAuth = async (payload) => {
  const { data } = await api.post("/auth/google", payload);
  return data;
};

export const me = async () => {
  const { data } = await api.get("/auth/me");
  return data;
};

export const addAddress = async (payload) => {
  const { data } = await api.post("/auth/addresses", payload);
  return data;
};

export const registerFcmToken = async (fcmToken) => {
  const { data } = await api.post("/auth/fcm-token", { fcmToken });
  return data;
};

export const updateMe = async (payload) => {
  const { data } = await api.put("/users/me", payload);
  return data;
};

export const getMyCards = async () => {
  const { data } = await api.get("/users/me/cards");
  return data;
};

export const addMyCard = async (payload) => {
  const { data } = await api.post("/users/me/cards", payload);
  return data;
};
