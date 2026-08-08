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
          {!isAdmin && isAuthenticated && (
            <>
              {(user?.role === "DOCTOR" || user?.role === "NURSE") && (
                <Link to="/dashboard" style={styles.navItem}>
                  Quản lý Bệnh nhân
                </Link>
              )}
              <Link to="/profile" style={styles.navItem}>
                Hồ sơ
              </Link>
            </>
          )}
          {isAdmin && (
            <>
              <Link to="/admin-dashboard" style={styles.navItem}>
                Tổng quan
              </Link>
              <Link to="/staff-management" style={styles.navItem}>
                Quản lý Bác sĩ/Y tá
              </Link>
              <Link to="/patient-management" style={styles.navItem}>
                Quản lý Bệnh nhân
              </Link>
            </>
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
          {!isAdmin && isAuthenticated && (
            <>
              {(user?.role === "DOCTOR" || user?.role === "NURSE") && (
                <Link
                  to="/dashboard"
                  style={styles.navItemMobile}
                  onClick={closeMenu}
                >
                  Quản lý Bệnh nhân
                </Link>
              )}
              <Link
                to="/profile"
                style={styles.navItemMobile}
                onClick={closeMenu}
              >
                Hồ sơ
              </Link>
            </>
          )}
          {isAdmin && (
            <>
              <Link
                to="/admin-dashboard"
                style={styles.navItemMobile}
                onClick={closeMenu}
              >
                Tổng quan
              </Link>
              <Link
                to="/staff-management"
                style={styles.navItemMobile}
                onClick={closeMenu}
              >
                Quản lý Bác sĩ/Y tá
              </Link>
              <Link
                to="/patient-management"
                style={styles.navItemMobile}
                onClick={closeMenu}
              >
                Quản lý Bệnh nhân
              </Link>
            </>
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

const COLORS = {
  ink: "#12211A",
  paper: "#F5F6F3",
  paperRaised: "#FFFFFF",
  safe: "#0B6E4F",
  risk: "#9A3324",
  muted: "#6B7268",
  hairline: "#D8DAD3",
};

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
    width: "34px",
    height: "34px",
    objectFit: "cover",
    borderRadius: "6px",
    flexShrink: 0,
  },
  logoTitle: {
    fontSize: "clamp(16px, 5vw, 19px)",
    fontWeight: 700,
    color: COLORS.ink,
    letterSpacing: "0.02em",
    whiteSpace: "nowrap",
  },

  // DESKTOP STYLES
  navItem: {
    textDecoration: "none",
    color: COLORS.muted,
    fontWeight: 600,
    fontSize: "14px",
    whiteSpace: "nowrap",
  },
  btnLogin: {
    backgroundColor: COLORS.safe,
    color: "#ffffff",
    padding: "8px 18px",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: "13px",
    whiteSpace: "nowrap",
  },
  btnLogout: {
    backgroundColor: COLORS.paperRaised,
    color: COLORS.risk,
    border: `1px solid ${COLORS.risk}`,
    padding: "7px 17px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "13px",
    whiteSpace: "nowrap",
  },

  // MOBILE DROPDOWN STYLES
  mobileMenuDropdown: {
    display: "flex",
    flexDirection: "column",
    backgroundColor: COLORS.paperRaised,
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    padding: "20px",
    borderTop: `1px solid ${COLORS.hairline}`,
    borderBottom: `1px solid ${COLORS.hairline}`,
    gap: "14px",
    zIndex: 999,
  },
  navItemMobile: {
    textDecoration: "none",
    color: COLORS.ink,
    fontWeight: 600,
    fontSize: "15px",
    padding: "10px 0",
    borderBottom: `1px solid ${COLORS.hairline}`,
  },
  btnLoginMobile: {
    backgroundColor: COLORS.safe,
    color: "#ffffff",
    padding: "13px",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: "14px",
    textAlign: "center",
  },
  btnLogoutMobile: {
    backgroundColor: COLORS.paperRaised,
    color: COLORS.risk,
    border: `1px solid ${COLORS.risk}`,
    padding: "13px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "14px",
    textAlign: "center",
  },
};
