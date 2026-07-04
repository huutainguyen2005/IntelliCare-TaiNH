import { NavLink } from "react-router-dom";
import { useCustomAuth } from "../context/AuthContext";

export default function Navbar() {
  const { isAuthenticated, user, logout } = useCustomAuth();

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <img src="/logo.jpg" alt="IntelliCare Logo" className="nav-logo" />
        <span className="nav-title">IntelliCare</span>
      </div>

      <div className="nav-links">
        {/* ĐỔI ĐIỀU KIỆN: Đã đăng nhập VÀ không phải là Bệnh nhân */}
        {user && user.role !== "PATIENT" ? (
          <NavLink
            to="/dashboard"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Quản lý Bệnh nhân
          </NavLink>
        ) : (
          <>
            <NavLink
              to="/register"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Hồ sơ
            </NavLink>
            <NavLink
              to="/scanner"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Quét mã
            </NavLink>
          </>
        )}

        {isAuthenticated && (
          <NavLink
            to="/profile"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Cá nhân
          </NavLink>
        )}

        {isAuthenticated ? (
          <button
            onClick={logout}
            className="btn-primary btn-outline"
            style={{ width: "auto", padding: "8px 16px", fontSize: "15px" }}
          >
            Đăng xuất ({user?.fullName})
          </button>
        ) : (
          <NavLink
            to="/login"
            className="btn-primary btn-dark"
            style={{
              width: "auto",
              padding: "8px 16px",
              fontSize: "15px",
              textDecoration: "none",
            }}
          >
            Đăng nhập
          </NavLink>
        )}
      </div>
    </nav>
  );
}
