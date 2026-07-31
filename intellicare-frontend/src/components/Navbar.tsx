import { Link, useLocation, useNavigate } from "react-router-dom";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();

  // 1. TÁCH BIỆT KIOSK: Nếu đang ở trang /scanner, ẩn hoàn toàn Navbar
  if (location.pathname === "/scanner") {
    return null; // Không render gì cả -> Trạm Kiosk sẽ Fullscreen
  }

  // Lấy token để kiểm tra trạng thái đăng nhập (đổi theo logic auth hiện tại của bro nếu cần)
  const token = localStorage.getItem("token");

  const handleLogout = () => {
    localStorage.removeItem("token");
    // Xóa thêm các thông tin user khác nếu có, VD: localStorage.removeItem("userRole");
    navigate("/login");
  };

  return (
    <nav style={styles.navbar}>
      <div style={styles.logoContainer}>
        <Link to="/" style={styles.logoLink}>
          <img src="/logo.jpg" alt="IntelliCare Logo" style={styles.logoIcon} />
          <span style={styles.logoTitle}>INTELLICARE</span>
        </Link>
      </div>

      {/* 2. MENU DÀNH CHO WEB APP (BỆNH NHÂN / BÁC SĨ) */}
      <div style={styles.navLinks}>
        {/* Đã fix url từ /register thành /profile */}
        <Link to="/profile" style={styles.navItem}>
          Hồ sơ
        </Link>

        {/* 3. LOGIC HIỂN THỊ NÚT ĐĂNG NHẬP / ĐĂNG XUẤT */}
        {token ? (
          <button onClick={handleLogout} style={styles.btnLogout}>
            Đăng xuất
          </button>
        ) : (
          <Link to="/login" style={styles.btnLogin}>
            Đăng nhập
          </Link>
        )}
      </div>
    </nav>
  );
}

const styles = {
  navbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "15px 50px",
    backgroundColor: "#ffffff",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
    position: "sticky",
    top: 0,
    zIndex: 1000,
    borderBottom: "1px solid #f1f5f9",
  },
  logoContainer: {
    display: "flex",
    alignItems: "center",
  },
  logoLink: {
    display: "flex",
    alignItems: "center",
    textDecoration: "none",
    gap: "10px",
  },
  logoIcon: {
    fontSize: "28px",
  },
  logoTitle: {
    fontSize: "22px",
    fontWeight: 900,
    color: "#0d9488",
    letterSpacing: "0.5px",
  },
  navLinks: {
    display: "flex",
    alignItems: "center",
    gap: "30px",
  },
  navItem: {
    textDecoration: "none",
    color: "#475569",
    fontWeight: 700,
    fontSize: "15px",
    transition: "0.2s",
  },
  btnLogin: {
    backgroundColor: "#0d9488",
    color: "#ffffff",
    padding: "10px 24px",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: 700,
    fontSize: "14px",
    transition: "0.2s",
    boxShadow: "0 2px 4px rgba(13, 148, 136, 0.2)",
  },
  btnLogout: {
    backgroundColor: "#ef4444",
    color: "#ffffff",
    padding: "10px 24px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "14px",
    transition: "0.2s",
    boxShadow: "0 2px 4px rgba(239, 68, 68, 0.2)",
  },
} as const;
