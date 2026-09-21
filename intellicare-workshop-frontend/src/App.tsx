import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AdminAuthProvider, useAdminAuth } from "./context/AdminAuthContext";
import Register from "./pages/Register";
import Session from "./pages/Session";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/errors/NotFound";

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAdminAuth();
  return isAuthenticated ? (
    <>{children}</>
  ) : (
    <Navigate to="/admin/login" replace />
  );
}

export default function App() {
  return (
    <AdminAuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Register />} />
          <Route path="/session/:sessionId" element={<Session />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin/dashboard"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AdminAuthProvider>
  );
}
