import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useCustomAuth } from "../context/AuthContext";
import axiosClient from "../api/axiosClient";
import { Link } from "react-router-dom";
import Modal from "../components/Modal";

const Login: React.FC = () => {
  const { isAuthenticated, user, login } = useCustomAuth();
  const navigate = useNavigate();

  const [loginType, setLoginType] = useState<"patient" | "staff">("patient");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [showActivateModal, setShowActivateModal] = useState(false);

  if (isAuthenticated) {
    return (
      <Navigate
        to={user?.role === "ADMIN" ? "/admin-dashboard" : "/profile"}
        replace
      />
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      const endpoint =
        loginType === "staff" ? "/auth/staff/login" : "/auth/patient/login";
      const response = await axiosClient.post(endpoint, {
        identifier: identifier.trim(),
        password,
      });
      const { token, role, fullName } = response.data;
      login(token, role, fullName, rememberMe);
      navigate(role === "ADMIN" ? "/admin-dashboard" : "/profile");
    } catch (error: any) {
      const errorCode = error.response?.data?.errorCode;
      const backendMsg = error.response?.data?.message;

      if (loginType === "patient" && errorCode === "NOT_ACTIVATED") {
        setErrorMsg(backendMsg || "Tài khoản chưa được kích hoạt.");
        setShowActivateModal(true);
      } else if (errorCode === "TOO_MANY_ATTEMPTS") {
        setErrorMsg(
          backendMsg ||
            "Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau ít phút.",
        );
      } else if (errorCode === "ACCOUNT_DISABLED") {
        setErrorMsg(
          backendMsg || "Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ!",
        );
      } else if (errorCode === "INVALID_CREDENTIALS") {
        setErrorMsg("Tài khoản hoặc mật khẩu không chính xác!");
      } else {
        setErrorMsg("Tài khoản hoặc mật khẩu không chính xác!");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.brandSection}>
          <h1 style={styles.brandTitle}>Đăng nhập tài khoản</h1>
        </div>

        <div style={styles.tabContainer}>
          <button
            style={{
              ...styles.tabBtn,
              ...(loginType === "patient" ? styles.tabBtnActive : {}),
            }}
            onClick={() => setLoginType("patient")}
          >
            Bệnh nhân
          </button>
          <button
            style={{
              ...styles.tabBtn,
              ...(loginType === "staff" ? styles.tabBtnActive : {}),
            }}
            onClick={() => setLoginType("staff")}
          >
            Nhân viên
          </button>
        </div>

        <form onSubmit={handleLogin}>
          <input
            style={styles.inputField}
            placeholder={
              loginType === "staff"
                ? "Tài khoản đăng nhập"
                : "Số điện thoại hoặc Email"
            }
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />

          <input
            style={styles.inputField}
            type="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div style={styles.forgotRow}>
            <Link to="/forgot-password" style={styles.forgotPasswordLink}>
              Quên mật khẩu?
            </Link>
          </div>

          <label style={styles.rememberMeRow}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            Ghi nhớ đăng nhập
          </label>

          <button type="submit" style={styles.btnSubmit} disabled={isLoading}>
            {isLoading ? "Đang xử lý…" : "Đăng nhập"}
          </button>
        </form>

        {loginType === "patient" && (
          <div style={styles.activateHintRow}>
            Chưa có tài khoản?{" "}
            <Link to="/activate" style={styles.activateInlineLink}>
              Kích hoạt tài khoản ngay
            </Link>
          </div>
        )}

        {errorMsg && <div style={styles.errorBox}>{errorMsg}</div>}
      </div>

      <Modal
        isOpen={showActivateModal}
        type="warning"
        message="Không tìm thấy tài khoản phù hợp. Nếu bạn đã đo sức khỏe tại Trạm cân Kiosk bằng CCCD nhưng chưa tạo mật khẩu, hãy kích hoạt tài khoản trước khi đăng nhập."
        onClose={() => setShowActivateModal(false)}
      />
    </div>
  );
};

const COLORS = {
  ink: "#12211A",
  paper: "#F5F6F3",
  paperRaised: "#FFFFFF",
  safe: "#0B6E4F",
  risk: "#9A3324",
  muted: "#6B7268",
  hairline: "#D8DAD3",
};

const FONT_SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const styles: { [key: string]: React.CSSProperties } = {
  wrapper: {
    width: "100%",
    minHeight: "calc(100vh - 70px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: COLORS.paper,
    fontFamily: FONT_SANS,
    padding: "20px",
    boxSizing: "border-box",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    boxSizing: "border-box",
    background: COLORS.paperRaised,
    borderRadius: "12px",
    padding: "clamp(28px, 5vw, 36px)",
    border: `1px solid ${COLORS.hairline}`,
  },
  brandSection: {
    textAlign: "center",
    marginBottom: "28px",
  },
  brandTitle: {
    fontSize: "24px",
    fontWeight: 700,
    color: COLORS.ink,
    margin: 0,
    letterSpacing: "-0.01em",
  },
  tabContainer: {
    display: "flex",
    background: COLORS.paper,
    padding: "4px",
    borderRadius: "8px",
    marginBottom: "24px",
    border: `1px solid ${COLORS.hairline}`,
  },
  tabBtn: {
    flex: 1,
    border: "none",
    background: "transparent",
    padding: "9px",
    fontSize: "14px",
    fontWeight: 600,
    color: COLORS.muted,
    cursor: "pointer",
    borderRadius: "6px",
    fontFamily: FONT_SANS,
  },
  tabBtnActive: {
    background: COLORS.paperRaised,
    color: COLORS.ink,
    border: `1px solid ${COLORS.hairline}`,
  },
  inputField: {
    width: "100%",
    padding: "11px 14px",
    fontSize: "14px",
    border: `1px solid ${COLORS.hairline}`,
    borderRadius: "8px",
    background: COLORS.paperRaised,
    color: COLORS.ink,
    boxSizing: "border-box",
    marginBottom: "12px",
    fontFamily: FONT_SANS,
    outline: "none",
  },
  forgotRow: {
    textAlign: "right",
    marginTop: "-6px",
  },
  forgotPasswordLink: {
    fontSize: "13px",
    color: COLORS.safe,
    fontWeight: 600,
    textDecoration: "none",
  },
  btnSubmit: {
    width: "100%",
    padding: "13px",
    border: "none",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: 600,
    color: "#ffffff",
    cursor: "pointer",
    background: COLORS.safe,
    marginTop: "8px",
    fontFamily: FONT_SANS,
  },
  activateHintRow: {
    textAlign: "center",
    fontSize: "13px",
    color: COLORS.muted,
    marginTop: "20px",
  },
  rememberMeRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    fontWeight: 500,
    color: COLORS.ink,
    marginTop: "12px",
    marginBottom: "4px",
    cursor: "pointer",
    userSelect: "none",
  },
  activateInlineLink: {
    color: COLORS.safe,
    fontWeight: 600,
    textDecoration: "none",
  },
  errorBox: {
    color: COLORS.risk,
    backgroundColor: COLORS.paper,
    padding: "12px",
    borderRadius: "8px",
    marginTop: "16px",
    textAlign: "center",
    fontWeight: 500,
    fontSize: "14px",
    border: `1px solid ${COLORS.hairline}`,
  },
};

export default Login;
