import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useCustomAuth } from "./context/AuthContext";
import Scanner from "./pages/Scanner";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Navbar from "./components/Navbar";
import StaffDashboard from "./pages/StaffDashboard";
import PatientDetail from "./pages/PatientDetail";
import PatientActivation from "./pages/PatientActivation";

// "kiosk"  -> máy quét tại trạm cân: CHỈ hiện /scanner, fullscreen, không có Navbar
// "web"    -> web app cho bệnh nhân/nhân viên: KHÔNG có /scanner
// Mặc định "web" nếu không set biến môi trường (an toàn cho local dev / build cũ)
const APP_MODE = import.meta.env.VITE_APP_MODE || "web";
const IS_KIOSK = APP_MODE === "kiosk";

function useKioskFullscreen() {
  useEffect(() => {
    if (!IS_KIOSK) return;

    const goFullscreen = () => {
      const el = document.documentElement;
      if (!document.fullscreenElement && el.requestFullscreen) {
        el.requestFullscreen().catch(() => {
          // Trình duyệt chặn nếu chưa có tương tác người dùng (user gesture).
          // Sẽ được kích hoạt lại ở lần chạm/click đầu tiên bên dưới.
        });
      }
    };

    // Thử fullscreen ngay khi load (thành công nếu Chrome chạy bằng --kiosk)
    goFullscreen();

    // Fallback: bắt buộc phải có 1 lần tương tác thật của người dùng
    // thì mới được phép gọi requestFullscreen (giới hạn bảo mật của trình duyệt)
    document.addEventListener("click", goFullscreen, { once: true });
    return () => document.removeEventListener("click", goFullscreen);
  }, []);
}

function KioskApp() {
  useKioskFullscreen();

  return (
    <Routes>
      <Route path="/scanner" element={<Scanner />} />
      {/* Bất kỳ đường dẫn nào khác trên Kiosk đều bị ép về /scanner */}
      <Route path="*" element={<Navigate to="/scanner" replace />} />
    </Routes>
  );
}

function WebApp() {
  const { isAuthenticated, user } = useCustomAuth();

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/activate" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/activate" element={<PatientActivation />} />

        <Route
          path="/profile"
          element={
            isAuthenticated ? <Profile /> : <Navigate to="/login" replace />
          }
        />

        {/* ĐỔI ĐIỀU KIỆN ROUTE: Cho phép truy cập nếu không phải ROLE_PATIENT */}
        <Route
          path="/dashboard"
          element={
            isAuthenticated && user?.role !== "ROLE_PATIENT" ? (
              <StaffDashboard />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/patient-detail/:id"
          element={
            isAuthenticated && user?.role !== "ROLE_PATIENT" ? (
              <PatientDetail />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Web app không có quyền vào /scanner (chỉ dành cho Kiosk) */}
        <Route path="/scanner" element={<Navigate to="/activate" replace />} />
        <Route path="*" element={<Navigate to="/activate" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return <BrowserRouter>{IS_KIOSK ? <KioskApp /> : <WebApp />}</BrowserRouter>;
}

export default App;
