import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCustomAuth } from "../context/AuthContext";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useCustomAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (location.pathname === "/scanner") {
    return null;
  }

  const isAdmin = user?.role === "ADMIN";

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
    navigate("/login");
  };

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <div style={{ position: "relative" }}>
      <nav className="navbar-container">
        <div style={styles.logoContainer}>
          <Link to="/" style={styles.logoLink} onClick={closeMenu}>
            <img
              src="/logo.jpg"
              alt="IntelliCare Logo"
              style={styles.logoIcon}
            />
            <span style={styles.logoTitle}>INTELLICARE</span>
          </Link>
        </div>

        {/* MENU TRÊN DESKTOP */}
        <div className="nav-links-desktop">
          <Link to="/profile" style={styles.navItem}>
            Hồ sơ
          </Link>
          {isAdmin && (
            <Link to="/staff-management" style={styles.navItem}>
              Quản lý Bác sĩ/Y tá
            </Link>
          )}
          {isAuthenticated ? (
            <button onClick={handleLogout} style={styles.btnLogout}>
              Đăng xuất
            </button>
          ) : (
            <Link to="/login" style={styles.btnLogin}>
              Đăng nhập
            </Link>
          )}
        </div>

        {/* NÚT HAMBURGER (Nằm ở vị trí thứ 2 bên phải logo/thanh nav) */}
        <button
          className="hamburger-btn"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <div className={`animated-icon2 ${isMenuOpen ? "open" : ""}`}>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>
      </nav>

      {/* DROPDOWN MENU MOBILE: Điều khiển hoàn toàn bằng State isMenuOpen */}
      {isMenuOpen && (
        <div style={styles.mobileMenuDropdown}>
          <Link to="/profile" style={styles.navItemMobile} onClick={closeMenu}>
            Hồ sơ
          </Link>
          {isAdmin && (
            <Link
              to="/staff-management"
              style={styles.navItemMobile}
              onClick={closeMenu}
            >
              Quản lý Bác sĩ/Y tá
            </Link>
          )}
          {isAuthenticated ? (
            <button onClick={handleLogout} style={styles.btnLogoutMobile}>
              Đăng xuất
            </button>
          ) : (
            <Link to="/login" style={styles.btnLoginMobile} onClick={closeMenu}>
              Đăng nhập
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  logoContainer: {
    display: "flex",
    alignItems: "center",
    minWidth: 0,
  },
  logoLink: {
    display: "flex",
    alignItems: "center",
    textDecoration: "none",
    gap: "8px",
  },
  logoIcon: {
    width: "36px",
    height: "36px",
    objectFit: "cover",
    borderRadius: "8px",
    flexShrink: 0,
  },
  logoTitle: {
    fontSize: "clamp(18px, 5vw, 22px)",
    fontWeight: 900,
    color: "#0d9488",
    letterSpacing: "0.5px",
    whiteSpace: "nowrap",
  },

  // DESKTOP STYLES
  navItem: {
    textDecoration: "none",
    color: "#475569",
    fontWeight: 700,
    fontSize: "15px",
    transition: "0.2s",
    whiteSpace: "nowrap",
  },
  btnLogin: {
    backgroundColor: "#0d9488",
    color: "#ffffff",
    padding: "8px 20px",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: 700,
    fontSize: "14px",
    transition: "0.2s",
    boxShadow: "0 2px 4px rgba(13, 148, 136, 0.2)",
    whiteSpace: "nowrap",
  },
  btnLogout: {
    backgroundColor: "#ef4444",
    color: "#ffffff",
    padding: "8px 20px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "14px",
    transition: "0.2s",
    boxShadow: "0 2px 4px rgba(239, 68, 68, 0.2)",
    whiteSpace: "nowrap",
  },

  // MOBILE DROPDOWN STYLES (Inline React để render trực tiếp mượt mà)
  mobileMenuDropdown: {
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#ffffff",
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    padding: "20px",
    boxShadow: "0 10px 15px rgba(0, 0, 0, 0.1)",
    borderTop: "1px solid #f1f5f9",
    gap: "15px",
    zIndex: 999,
  },
  navItemMobile: {
    textDecoration: "none",
    color: "#475569",
    fontWeight: 700,
    fontSize: "16px",
    padding: "10px 0",
    borderBottom: "1px solid #f1f5f9",
  },
  btnLoginMobile: {
    backgroundColor: "#0d9488",
    color: "#ffffff",
    padding: "14px",
    borderRadius: "10px",
    textDecoration: "none",
    fontWeight: 700,
    fontSize: "15px",
    textAlign: "center",
    boxShadow: "0 4px 10px rgba(13, 148, 136, 0.2)",
  },
  btnLogoutMobile: {
    backgroundColor: "#ef4444",
    color: "#ffffff",
    padding: "14px",
    borderRadius: "10px",
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "15px",
    textAlign: "center",
    boxShadow: "0 4px 10px rgba(239, 68, 68, 0.2)",
  },
};
