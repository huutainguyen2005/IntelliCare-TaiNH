import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useCustomAuth } from "../context/AuthContext";
import axiosClient from "../api/axiosClient";
import { Link } from "react-router-dom";

const Login: React.FC = () => {
  const { isAuthenticated, login } = useCustomAuth();
  const navigate = useNavigate();

  const [loginType, setLoginType] = useState<"patient" | "staff">("patient");
  const [authMethod, setAuthMethod] = useState<"password" | "otp">("password"); // Thêm state chọn phương thức
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/profile" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      if (authMethod === "password") {
        // LOGIN PASSWORD
        const endpoint =
          loginType === "staff" ? "/auth/staff/login" : "/auth/patient/login";
        const response = await axiosClient.post(endpoint, {
          identifier: identifier.trim(),
          password,
        });
        const { token, role, fullName, accountStatus } = response.data;

        // Check status PENDING
        if (accountStatus === "PENDING_PASSWORD") {
          navigate("/set-password", { state: { identifier } });
        } else {
          login(token, role, fullName);
          navigate("/profile");
        }
      } else {
        // LOGIN OTP
        const response = await axiosClient.post("/auth/patient/login-otp", {
          identifier: identifier.trim(),
          otp,
        });
        const { token, role, fullName, accountStatus } = response.data;

        if (accountStatus === "PENDING_PASSWORD") {
          navigate("/set-password", { state: { identifier } });
        } else {
          login(token, role, fullName);
          navigate("/profile");
        }
      }
    } catch (error: any) {
      const status = error.response?.status;

      if (
        status === 401 ||
        status === 400 ||
        status === 404 ||
        status === 500
      ) {
        setErrorMsg("Sai tài khoản hoặc mật khẩu!");
      } else {
        setErrorMsg("Đăng nhập thất bại. Vui lòng thử lại!");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.brandSection}>
          <h2 style={styles.brandTitle}>INTELLICARE</h2>
        </div>

        <div style={styles.tabContainer}>
          <button
            style={{
              ...styles.tabBtn,
              ...(loginType === "patient" ? styles.tabBtnActive : {}),
            }}
            onClick={() => {
              setLoginType("patient");
              setAuthMethod("password");
            }}
          >
            👤 Bệnh nhân
          </button>
          <button
            style={{
              ...styles.tabBtn,
              ...(loginType === "staff" ? styles.tabBtnActive : {}),
            }}
            onClick={() => {
              setLoginType("staff");
              setAuthMethod("password");
            }}
          >
            🩺 Nhân viên
          </button>
        </div>

        {loginType === "patient" && (
          <div style={{ marginBottom: "20px", textAlign: "center" }}>
            <button
              onClick={() => setAuthMethod("password")}
              style={
                authMethod === "password"
                  ? styles.btnLinkActive
                  : styles.btnLink
              }
            >
              Mật khẩu
            </button>{" "}
            |
            <button
              onClick={() => setAuthMethod("otp")}
              style={
                authMethod === "otp" ? styles.btnLinkActive : styles.btnLink
              }
            >
              {" "}
              Đăng nhập OTP
            </button>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={styles.inputGroup}>
            <input
              style={styles.inputField}
              placeholder="Số điện thoại hoặc Email..."
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>

          {authMethod === "password" ? (
            <input
              style={styles.inputField}
              type="password"
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          ) : (
            <input
              style={styles.inputField}
              type="text"
              placeholder="Nhập mã OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />
          )}

          <button type="submit" style={styles.btnSubmit} disabled={isLoading}>
            {isLoading ? "ĐANG XỬ LÝ..." : "ĐĂNG NHẬP"}
          </button>
        </form>

        {/* XỬ LÝ LỖI HIỂN THỊ THEO ROLE */}
        {errorMsg &&
          (loginType === "patient" ? (
            // Dành cho Bệnh nhân: Hiện gợi ý kích hoạt
            <div style={styles.smartAlertBox as any}>
              <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
                ⚠️ {errorMsg}
              </div>

              <div
                style={{
                  fontSize: "13px",
                  color: "#334155",
                  marginBottom: "12px",
                  lineHeight: "1.4",
                }}
              >
                Bạn đã đo sức khỏe tại Trạm cân Kiosk bằng thẻ CCCD nhưng chưa
                tạo mật khẩu?
              </div>

              <Link to="/activate" style={styles.activateLinkBtn as any}>
                Kích hoạt hồ sơ ngay ➔
              </Link>
            </div>
          ) : (
            // Dành cho Nhân viên: Chỉ báo lỗi đỏ cơ bản, không có nút kích hoạt
            <div
              style={{
                color: "#e11d48",
                backgroundColor: "#fff1f2",
                padding: "12px",
                borderRadius: "8px",
                marginTop: "24px",
                textAlign: "center",
                fontWeight: 600,
                border: "1px solid #fecdd3",
              }}
            >
              ⚠️ {errorMsg}
            </div>
          ))}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  wrapper: {
    width: "100%",
    minHeight: "calc(100vh - 70px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "var(--bg)",
    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    padding: "10px",
    boxSizing: "border-box",
  },
  card: {
    width: "100%",
    maxWidth: "460px",
    boxSizing: "border-box",
    background: "rgba(255, 255, 255, 0.92)",
    backdropFilter: "blur(16px)",
    borderRadius: "24px",
    padding: "clamp(24px, 5vw, 35px) clamp(20px, 5vw, 30px)",
    border: "1px solid rgba(255, 255, 255, 0.6)",
    boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.08)",
  },
  brandSection: {
    textAlign: "center",
    marginBottom: "24px",
  },
  brandTitle: {
    fontSize: "clamp(22px, 5vw, 26px)",
    fontWeight: 900,
    color: "#0d9488",
    margin: 0,
    letterSpacing: "1px",
  },
  tabContainer: {
    display: "flex",
    background: "#f1f5f9",
    padding: "4px",
    borderRadius: "12px",
    marginBottom: "20px", // Ép khoảng cách
    border: "1px solid #e2e8f0",
  },
  tabBtn: {
    flex: 1,
    border: "none",
    background: "transparent",
    padding: "8px",
    fontSize: "14px",
    fontWeight: 700,
    color: "#64748b",
    cursor: "pointer",
    borderRadius: "8px",
    transition: "all 0.2s",
  },
  tabBtnActive: {
    background: "#ffffff",
    color: "#0f766e",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  inputGroup: {
    marginBottom: "15px",
  },
  inputField: {
    width: "100%",
    padding: "12px 14px", // Ép nhỏ input
    fontSize: "14px",
    border: "2px solid #e2e8f0",
    borderRadius: "10px",
    background: "#f8fafc",
    color: "#0f172a",
    boxSizing: "border-box",
    marginBottom: "12px", // Ép khoảng cách
    fontWeight: "500",
  },
  btnSubmit: {
    width: "100%",
    padding: "12px",
    border: "none",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: 800,
    color: "#ffffff",
    cursor: "pointer",
    background: "linear-gradient(135deg, #0d9488 0%, #059669 100%)",
    boxShadow: "0 4px 12px rgba(13, 148, 136, 0.2)",
    marginTop: "8px",
  },
  btnLink: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: "13px",
  },
  btnLinkActive: {
    background: "none",
    border: "none",
    color: "#0d9488",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "bold",
  },
  smartAlertBox: {
    backgroundColor: "#fff1f2",
    border: "1px solid #fecdd3",
    color: "#e11d48",
    padding: "12px",
    borderRadius: "10px",
    marginTop: "16px",
    textAlign: "left",
    display: "flex",
    flexDirection: "column",
  },
  activateLinkBtn: {
    display: "inline-block",
    backgroundColor: "#0d9488",
    color: "#ffffff",
    padding: "8px 12px",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: 600,
    textDecoration: "none",
    textAlign: "center",
    marginTop: "8px",
  },
};

export default Login;
