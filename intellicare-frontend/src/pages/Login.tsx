import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useCustomAuth } from "../context/AuthContext";
import axiosClient from "../api/axiosClient";

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
    } catch (err: any) {
      setErrorMsg(err.response?.data || "Sai thông tin đăng nhập!");
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
      </div>
    </div>
  );
};

// --- ĐỐI TƯỢNG STYLES BIOTECH CHUẨN REACT (Giữ nguyên giao diện của bạn) ---
const styles: { [key: string]: React.CSSProperties } = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "radial-gradient(circle at 50% 50%, #f0fdfa 0%, #e2e8f0 100%)",
    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    padding: "20px",
    boxSizing: "border-box",
    position: "relative",
    overflow: "hidden",
  },
  glowLeft: {
    position: "absolute",
    width: "400px",
    height: "400px",
    borderRadius: "50%",
    background: "rgba(20, 184, 166, 0.25)",
    top: "-10%",
    left: "-10%",
    filter: "blur(80px)",
    pointerEvents: "none",
  },
  glowRight: {
    position: "absolute",
    width: "400px",
    height: "400px",
    borderRadius: "50%",
    background: "rgba(16, 185, 129, 0.2)",
    bottom: "-10%",
    right: "-10%",
    filter: "blur(80px)",
    pointerEvents: "none",
  },
  card: {
    background: "rgba(255, 255, 255, 0.92)",
    backdropFilter: "blur(16px)",
    width: "100%",
    maxWidth: "450px",
    borderRadius: "32px",
    boxShadow:
      "0 10px 25px -5px rgba(15, 23, 42, 0.03), 0 20px 50px -12px rgba(15, 23, 42, 0.08)",
    padding: "45px 40px",
    boxSizing: "border-box",
    border: "1px solid rgba(255, 255, 255, 0.6)",
    position: "relative",
    zIndex: 1,
  },
  brandSection: {
    textAlign: "center",
    marginBottom: "35px",
  },
  logoContainer: {
    display: "inline-block",
    padding: "8px",
    background: "#ffffff",
    borderRadius: "24px",
    boxShadow: "0 8px 20px rgba(13, 148, 136, 0.1)",
    marginBottom: "16px",
  },
  brandLogo: {
    width: "100px",
    height: "100px",
    borderRadius: "18px",
    objectFit: "cover",
  },
  brandTitle: {
    fontSize: "28px",
    fontWeight: 900,
    color: "#111827",
    margin: 0,
    letterSpacing: "1px",
    background: "linear-gradient(135deg, #0f766e 0%, #059669 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  brandSubtitle: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#64748b",
    marginTop: "6px",
    letterSpacing: "0.5px",
  },
  tabContainer: {
    display: "flex",
    background: "#f1f5f9",
    padding: "4px",
    borderRadius: "16px",
    marginBottom: "30px",
    border: "1px solid #e2e8f0",
  },
  tabBtn: {
    flex: 1,
    border: "none",
    background: "transparent",
    padding: "12px 8px",
    fontSize: "14px",
    fontWeight: 700,
    color: "#64748b",
    cursor: "pointer",
    borderRadius: "12px",
    transition: "all 0.25s ease",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "6px",
  },
  tabIcon: {
    fontSize: "16px",
  },
  tabBtnActive: {
    background: "#ffffff",
    color: "#0f766e",
    boxShadow:
      "0 4px 12px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.02)",
  },
  inputGroup: {
    marginBottom: "22px",
    textAlign: "left",
  },
  inputLabel: {
    display: "block",
    fontSize: "13px",
    fontWeight: 700,
    marginBottom: "8px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    transition: "color 0.2s ease",
  },
  inputWrapper: {
    position: "relative",
  },
  inputIcon: {
    position: "absolute",
    left: "16px",
    top: "50%",
    transform: "translateY(-50%)",
    display: "flex",
    alignItems: "center",
    pointerEvents: "none",
    transition: "color 0.2s ease",
  },
  inputField: {
    width: "100%",
    padding: "15px 16px 15px 48px",
    fontSize: "15px",
    border: "2px solid #e2e8f0",
    borderRadius: "14px",
    background: "#f8fafc",
    color: "#0f172a",
    boxSizing: "border-box",
    transition: "all 0.25s ease",
    fontWeight: "500",
  },
  inputFieldFocus: {
    outline: "none",
    borderColor: "#0d9488",
    background: "#ffffff",
    boxShadow: "0 0 0 4px rgba(13, 148, 136, 0.15)",
  },
  alertError: {
    background: "#fff5f5",
    border: "1px solid #fee2e2",
    color: "#b91c1c",
    padding: "14px 16px",
    borderRadius: "14px",
    fontSize: "14px",
    fontWeight: 600,
    marginBottom: "25px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    boxShadow: "0 4px 12px rgba(220, 38, 38, 0.03)",
  },
  btnSubmit: {
    width: "100%",
    padding: "16px",
    border: "none",
    borderRadius: "14px",
    fontSize: "16px",
    fontWeight: 800,
    color: "#ffffff",
    cursor: "pointer",
    background: "linear-gradient(135deg, #0d9488 0%, #059669 100%)",
    boxShadow: "0 4px 14px rgba(13, 148, 136, 0.3)",
    transition: "all 0.25s ease",
    marginTop: "10px",
    letterSpacing: "0.5px",
    fontFamily: "'Segoe UI', Roboto, sans-serif",
  },
  btnSubmitHover: {
    transform: "translateY(-1.5px)",
    boxShadow: "0 8px 20px rgba(13, 148, 136, 0.4)",
  },
  btnSubmitDisabled: {
    background: "#cbd5e1",
    boxShadow: "none",
    cursor: "not-allowed",
    color: "#64748b",
  },
  loaderContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "10px",
  },
  spinner: {
    width: "18px",
    height: "18px",
    border: "2.5px solid rgba(255,255,255,0.3)",
    borderTop: "2.5px solid #ffffff",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  footerText: {
    textAlign: "center",
    marginTop: "28px",
    fontSize: "12px",
    fontWeight: 600,
    color: "#94a3b8",
  },
  btnLink: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: "14px",
  },
  btnLinkActive: {
    background: "none",
    border: "none",
    color: "#0d9488",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
  },
};

export default Login;
