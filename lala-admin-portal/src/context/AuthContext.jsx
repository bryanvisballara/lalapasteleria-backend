import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { loginUser } from "../api/auth";
import { setAuthToken } from "../api/http";

const AuthContext = createContext(null);

const STORAGE_KEY = "lala_portal_session";

const readStoredSession = () => {
  try {
    const rawSession = localStorage.getItem(STORAGE_KEY);
    if (!rawSession) return null;
    return JSON.parse(rawSession);
  } catch {
    return null;
  }
};

const initialSession = readStoredSession();
if (initialSession?.token) {
  setAuthToken(initialSession.token);
}

export const AuthProvider = ({ children }) => {

  const [token, setToken] = useState(initialSession?.token || "");
  const [user, setUser] = useState(initialSession?.user || null);

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  const saveSession = (nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    setAuthToken(nextToken);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        token: nextToken,
        user: nextUser
      })
    );
  };

  const clearSession = () => {
    setToken("");
    setUser(null);
    setAuthToken("");
    localStorage.removeItem(STORAGE_KEY);
  };

  const login = async ({ email, password }) => {
    const data = await loginUser({ email, password });

    if (!["seller", "admin"].includes(data?.user?.role)) {
      throw new Error("Acceso permitido solo para admin o seller");
    }

    saveSession(data.token, data.user);
    return data;
  };

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      login,
      logout: clearSession
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }

  return context;
};
