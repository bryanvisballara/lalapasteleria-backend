import { useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import SellerPanelPage from "./pages/SellerPanelPage";
import AdminPortalPage from "./pages/AdminPortalPage";

export default function App() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (user?.role === "admin") {
    return <AdminPortalPage />;
  }

  return <SellerPanelPage />;
}
