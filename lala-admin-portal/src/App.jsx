import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import SellerPanelPage from "./pages/SellerPanelPage";
import AdminPortalPage from "./pages/AdminPortalPage";
import ProtectedRoute from "./components/ProtectedRoute";

function LoginRoute() {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated) {
    return <Navigate to={user?.role === "admin" ? "/admin" : "/seller"} replace />;
  }

  return <LoginPage />;
}

function HomeRedirect() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  return <Navigate to="/seller" replace />;
}

const routerBasename = (import.meta.env.BASE_URL || "/").replace(/\/$/, "") || undefined;

export default function App() {
  return (
    <BrowserRouter basename={routerBasename}>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route
          path="/admin"
          element={(
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminPortalPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/seller"
          element={(
            <ProtectedRoute allowedRoles={["seller"]}>
              <SellerPanelPage />
            </ProtectedRoute>
          )}
        />
        <Route path="/" element={<HomeRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
