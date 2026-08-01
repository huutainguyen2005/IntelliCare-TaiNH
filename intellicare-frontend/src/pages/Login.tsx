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

  // Modal nhắc kích hoạt tài khoản khi bệnh nhân cố đăng nhập mà đăng nhập lỗi
  // (phòng trường hợp họ phớt lờ dòng link "Kích hoạt tài khoản" phía dưới form)
  const [showActivateModal, setShowActivateModal] = useState(false);

  if (isAuthenticated) {
    return (
      <Navigate
        to={user?.role === "ADMIN" ? "/staff-management" : "/profile"}
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
      navigate(role === "ADMIN" ? "/staff-management" : "/profile");
    } catch (error: any) {
      const errorCode = error.response?.data?.errorCode;
      const backendMsg = error.response?.data?.message;

      if (loginType === "patient" && errorCode === "NOT_ACTIVATED") {
        // Chỉ hiện Modal đúng lúc tài khoản thật sự chưa kích hoạt,
        // không làm phiền người dùng khi họ chỉ đơn giản gõ sai mật khẩu.
        setErrorMsg(backendMsg || "Tài khoản chưa được kích hoạt.");
        setShowActivateModal(true);
      } else if (errorCode === "TOO_MANY_ATTEMPTS") {
        // Bị rate limit do sai quá nhiều lần liên tiếp - không phải lỗi sai TK/MK
        setErrorMsg(
          backendMsg ||
            "Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau ít phút.",
        );
      } else if (errorCode === "ACCOUNT_DISABLED") {
        setErrorMsg(
          backendMsg || "Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ!",
        );
      } else if (errorCode === "INVALID_CREDENTIALS") {
        // Gộp chung "không tìm thấy TK" + "sai mật khẩu" -> chống dò tài khoản
        setErrorMsg("Tài khoản hoặc mật khẩu không chính xác!");
      } else {
        // /staff/login chưa trả errorCode (chưa sửa BE cho nhánh này),
        // nên giữ message chung như cũ cho tab Nhân viên.
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
          <h2 style={styles.brandTitle}>INTELLICARE</h2>
        </div>

        <div style={styles.tabContainer}>
          <button
            style={{
              ...styles.tabBtn,
              ...(loginType === "patient" ? styles.tabBtnActive : {}),
            }}
            onClick={() => setLoginType("patient")}
          >
            👤 Bệnh nhân
          </button>
          <button
            style={{
              ...styles.tabBtn,
              ...(loginType === "staff" ? styles.tabBtnActive : {}),
            }}
            onClick={() => setLoginType("staff")}
          >
            🩺 Nhân viên
          </button>
        </div>

        <form onSubmit={handleLogin}>
          <div style={styles.inputGroup}>
            <input
              style={styles.inputField}
              placeholder={
                loginType === "staff"
                  ? "Tài khoản đăng nhập"
                  : "Số điện thoại hoặc Email..."
              }
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>

          <input
            style={styles.inputField}
            type="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div style={{ textAlign: "right", marginTop: "-6px" }}>
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
            {isLoading ? "ĐANG XỬ LÝ..." : "ĐĂNG NHẬP"}
          </button>
        </form>

        {/* LINK KÍCH HOẠT - LUÔN HIỂN THỊ cho tab Bệnh nhân, không đợi lỗi */}
        {loginType === "patient" && (
          <div style={styles.activateHintRow}>
            Chưa có tài khoản?{" "}
            <Link to="/activate" style={styles.activateInlineLink}>
              Kích hoạt tài khoản ngay
            </Link>
          </div>
        )}

        {/* LỖI ĐĂNG NHẬP - chỉ báo đỏ đơn giản, phần nhắc kích hoạt đã
            chuyển qua Modal (showActivateModal) để không bị bỏ lỡ */}
        {errorMsg && <div style={styles.errorBox}>⚠️ {errorMsg}</div>}
      </div>

      {/* MODAL NHẮC KÍCH HOẠT - hiện khi Bệnh nhân đăng nhập lỗi,
          phòng trường hợp họ phớt lờ dòng link phía trên mà vẫn cố nhập */}
      <Modal
        isOpen={showActivateModal}
        type="warning"
        message="Không tìm thấy tài khoản phù hợp. Nếu bạn đã đo sức khỏe tại Trạm cân Kiosk bằng CCCD nhưng chưa tạo mật khẩu, hãy kích hoạt tài khoản trước khi đăng nhập."
        onClose={() => setShowActivateModal(false)}
      />
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
    marginBottom: "20px",
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
    padding: "12px 14px",
    fontSize: "14px",
    border: "2px solid #e2e8f0",
    borderRadius: "10px",
    background: "#f8fafc",
    color: "#0f172a",
    boxSizing: "border-box",
    marginBottom: "12px",
    fontWeight: "500",
  },
  forgotPasswordLink: {
    fontSize: "12px",
    color: "#0d9488",
    fontWeight: 700,
    textDecoration: "none",
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
  activateHintRow: {
    textAlign: "center",
    fontSize: "13px",
    color: "#64748b",
    marginTop: "18px",
  },
  rememberMeRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    fontWeight: 600,
    color: "#475569",
    marginTop: "12px",
    marginBottom: "4px",
    cursor: "pointer",
    userSelect: "none",
  },
  activateInlineLink: {
    color: "#0d9488",
    fontWeight: 700,
    textDecoration: "none",
  },
  errorBox: {
    color: "#e11d48",
    backgroundColor: "#fff1f2",
    padding: "12px",
    borderRadius: "8px",
    marginTop: "14px",
    textAlign: "center",
    fontWeight: 600,
    border: "1px solid #fecdd3",
  },
};

export default Login;
