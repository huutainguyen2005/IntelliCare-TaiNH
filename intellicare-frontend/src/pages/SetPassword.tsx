import { useState } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import Modal from "../components/Modal";

export default function SetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const identifier = location.state?.identifier;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // State toggle ẩn/hiện
  const [loading, setLoading] = useState(false);

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    message: "",
    type: "warning" as "success" | "error" | "warning",
  });

  if (!identifier) return <Navigate to="/login" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6)
      return setModalConfig({
        isOpen: true,
        message: "Mật khẩu phải có ít nhất 6 ký tự!",
        type: "warning",
      });
    if (password !== confirmPassword)
      return setModalConfig({
        isOpen: true,
        message: "Mật khẩu xác nhận không khớp!",
        type: "warning",
      });

    setLoading(true);
    try {
      await axiosClient.post("/auth/patient/set-password", {
        identifier,
        password,
      });
      setModalConfig({
        isOpen: true,
        message: "Thiết lập thành công! Vui lòng đăng nhập lại.",
        type: "success",
      });
      setTimeout(() => navigate("/login"), 2000);
    } catch (error: any) {
      setModalConfig({
        isOpen: true,
        message: error.response?.data || "Lỗi hệ thống",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.appContainer}>
      <div style={styles.card}>
        <h2 style={styles.appTitle}>THIẾT LẬP MẬT KHẨU</h2>
        <form onSubmit={handleSubmit}>
          {/* Mật khẩu 1 */}
          <label style={styles.infoLabel}>Mật khẩu mới *</label>
          <div style={styles.passwordContainer}>
            <input
              style={styles.inputField}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              style={styles.toggleBtn}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "ẨN" : "HIỆN"}
            </button>
          </div>

          <label style={styles.infoLabel}>Xác nhận mật khẩu *</label>
          <input
            style={styles.inputField}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <button type="submit" disabled={loading} style={styles.btnPrimary}>
            {loading ? "ĐANG LƯU..." : "HOÀN TẤT"}
          </button>
        </form>
      </div>
      <Modal
        {...modalConfig}
        onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

const styles = {
  appContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "calc(100vh - 80px)",
    backgroundColor: "#f0fdfa",
    padding: "20px",
    fontFamily: "'Segoe UI', Roboto, sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: "400px",
    backgroundColor: "#ffffff",
    borderRadius: "24px",
    padding: "40px 35px",
    boxShadow: "0 10px 25px -5px rgba(13, 148, 136, 0.1)",
    border: "1px solid #ccfbf1",
  },
  appTitle: {
    fontSize: "22px",
    fontWeight: 800,
    color: "#0d9488",
    textAlign: "center",
    marginBottom: "20px",
  },
  infoLabel: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#334155",
    marginBottom: "8px",
    textTransform: "uppercase",
  },
  inputField: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "15px",
    marginBottom: "20px",
    outline: "none",
    boxSizing: "border-box",
  },
  btnPrimary: {
    width: "100%",
    padding: "14px",
    backgroundColor: "#0d9488",
    color: "#ffffff",
    border: "none",
    borderRadius: "12px",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(13, 148, 136, 0.2)",
  },
  passwordContainer: {
    position: "relative",
  },
  toggleBtn: {
    position: "absolute",
    right: "15px",
    top: "12px",
    background: "none",
    border: "none",
    color: "#0d9488",
    fontSize: "12px",
    cursor: "pointer",
    fontWeight: "bold",
  },
} as const;
