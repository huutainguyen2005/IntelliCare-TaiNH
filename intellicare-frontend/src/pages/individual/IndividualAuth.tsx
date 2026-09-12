import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { useCustomAuth } from "../../context/AuthContext";
import Modal from "../../components/Modal";

// Đăng ký + Đăng nhập cho Người dùng cá nhân (Nhóm 3) - TÁCH BIỆT hoàn
// toàn với /login (Bệnh nhân/Nhân viên bệnh viện), dùng endpoint riêng
// /auth/individual/**.
export default function IndividualAuth() {
  const navigate = useNavigate();
  const { login } = useCustomAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    message: string;
    type: "success" | "error" | "warning";
    onConfirm?: () => void;
  }>({ isOpen: false, message: "", type: "warning" });
  const showModal = (
    message: string,
    type: "success" | "error" | "warning",
    onConfirm?: () => void,
  ) => setModalConfig({ isOpen: true, message, type, onConfirm });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axiosClient.post("/auth/individual/login", {
        identifier: identifier.trim(),
        password,
      });
      const { token, role, fullName: name } = res.data;
      login(token, role, name, true);
      navigate("/individual/home");
    } catch (error: any) {
      const backendMsg = error.response?.data?.message;
      showModal(
        backendMsg || "Tài khoản hoặc mật khẩu không chính xác!",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim() && !email.trim()) {
      showModal("Cần ít nhất Số điện thoại hoặc Email!", "warning");
      return;
    }
    if (regPassword.length < 6) {
      showModal("Mật khẩu phải có ít nhất 6 ký tự!", "warning");
      return;
    }

    setLoading(true);
    try {
      await axiosClient.post("/auth/individual/register", {
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim() || null,
        email: email.trim() || null,
        password: regPassword,
      });
      showModal("Đăng ký thành công! Vui lòng đăng nhập.", "success", () => {
        setMode("login");
        setIdentifier(phoneNumber.trim() || email.trim());
      });
    } catch (error: any) {
      const backendMsg = error.response?.data?.message;
      showModal(backendMsg || "Không thể đăng ký. Vui lòng thử lại!", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.pageBackground}>
      <div style={styles.card}>
        <div style={styles.eyebrow}>Cá nhân</div>
        <h1 style={styles.title}>
          {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
        </h1>

        <div style={styles.tabContainer}>
          <button
            style={{
              ...styles.tabBtn,
              ...(mode === "login" ? styles.tabBtnActive : {}),
            }}
            onClick={() => setMode("login")}
          >
            Đăng nhập
          </button>
          <button
            style={{
              ...styles.tabBtn,
              ...(mode === "register" ? styles.tabBtnActive : {}),
            }}
            onClick={() => setMode("register")}
          >
            Đăng ký
          </button>
        </div>

        {mode === "login" ? (
          <form onSubmit={handleLogin}>
            <label style={styles.label}>Số điện thoại hoặc Email</label>
            <input
              style={styles.input}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
            <label style={styles.label}>Mật khẩu</label>
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit" disabled={loading} style={styles.btnPrimary}>
              {loading ? "Đang xử lý…" : "Đăng nhập"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <label style={styles.label}>Họ và tên</label>
            <input
              style={styles.input}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <label style={styles.label}>Số điện thoại</label>
            <input
              style={styles.input}
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="VD: 0912345678"
            />
            <label style={styles.label}>Email (tùy chọn nếu đã có SĐT)</label>
            <input
              style={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <label style={styles.label}>Mật khẩu</label>
            <input
              style={styles.input}
              type="password"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              placeholder="Ít nhất 6 ký tự"
              required
            />
            <button type="submit" disabled={loading} style={styles.btnPrimary}>
              {loading ? "Đang xử lý…" : "Tạo tài khoản"}
            </button>
          </form>
        )}
      </div>

      <Modal
        {...modalConfig}
        onClose={() => {
          setModalConfig((prev) => ({ ...prev, isOpen: false }));
          if (modalConfig.onConfirm) modalConfig.onConfirm();
        }}
      />
    </div>
  );
}

const COLORS = {
  ink: "#12211A",
  paper: "#F5F6F3",
  paperRaised: "#FFFFFF",
  accent: "#0B6E4F",
  muted: "#6B7268",
  hairline: "#D8DAD3",
};
const FONT_SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

const styles: { [key: string]: React.CSSProperties } = {
  pageBackground: {
    minHeight: "calc(100vh - 70px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: COLORS.paper,
    padding: "20px",
    boxSizing: "border-box",
    fontFamily: FONT_SANS,
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    background: COLORS.paperRaised,
    borderRadius: "12px",
    border: `1px solid ${COLORS.hairline}`,
    padding: "clamp(28px, 5vw, 36px)",
    boxSizing: "border-box",
  },
  eyebrow: {
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: COLORS.muted,
    textAlign: "center",
    marginBottom: "6px",
  },
  title: {
    fontSize: "22px",
    fontWeight: 700,
    color: COLORS.ink,
    textAlign: "center",
    margin: "0 0 20px 0",
  },
  tabContainer: {
    display: "flex",
    background: COLORS.paper,
    padding: "4px",
    borderRadius: "8px",
    marginBottom: "22px",
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
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: 600,
    color: COLORS.muted,
    marginBottom: "6px",
    marginTop: "14px",
  },
  input: {
    width: "100%",
    padding: "11px 14px",
    fontSize: "14px",
    border: `1px solid ${COLORS.hairline}`,
    borderRadius: "8px",
    background: COLORS.paperRaised,
    color: COLORS.ink,
    boxSizing: "border-box",
    fontFamily: FONT_SANS,
    outline: "none",
  },
  btnPrimary: {
    width: "100%",
    padding: "13px",
    border: "none",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: 600,
    color: "#ffffff",
    cursor: "pointer",
    background: COLORS.accent,
    marginTop: "22px",
    fontFamily: FONT_SANS,
  },
};
