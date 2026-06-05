import axios from "axios";

const SESSION_STORAGE_KEY = "lala_portal_session";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api"
});

const readStoredToken = () => {
  try {
    const rawSession = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!rawSession) return "";
    return JSON.parse(rawSession).token || "";
  } catch {
    return "";
  }
};

api.interceptors.request.use((config) => {
  const token = readStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

export default api;
