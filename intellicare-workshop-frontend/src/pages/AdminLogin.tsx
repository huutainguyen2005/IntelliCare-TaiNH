import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import { useAdminAuth } from "../context/AdminAuthContext";
import { COLORS, FONT_SANS } from "../theme";

export default function AdminLogin() {
  const { isAuthenticated, login } = useAdminAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (isAuthenticated) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await axiosClient.post("/auth/admin/login", {
        username: username.trim(),
        password,
      });
      login(res.data.token, res.data.username);
      navigate("/admin/dashboard");
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Tài khoản hoặc mật khẩu không đúng!",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.pageBackground}>
      <div style={styles.card}>
        <div style={styles.eyebrow}>Quản trị</div>
        <h1 style={styles.title}>Đăng nhập Admin</h1>

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Tài khoản</label>
          <input
            style={styles.input}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
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

        {error && <div style={styles.errorBox}>{error}</div>}
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  pageBackground: {
    width: "100%",
    minHeight: "100vh",
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
    maxWidth: "380px",
    background: COLORS.paperRaised,
    borderRadius: "12px",
    border: `1px solid ${COLORS.hairline}`,
    padding: "clamp(28px, 6vw, 36px)",
    boxSizing: "border-box",
  },
  eyebrow: {
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: COLORS.muted,
    textAlign: "center",
    marginBottom: "8px",
  },
  title: {
    fontSize: "22px",
    fontWeight: 700,
    color: COLORS.ink,
    textAlign: "center",
    margin: "0 0 24px 0",
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
    background: COLORS.safe,
    marginTop: "22px",
    fontFamily: FONT_SANS,
  },
  errorBox: {
    color: COLORS.risk,
    backgroundColor: COLORS.paper,
    padding: "12px",
    borderRadius: "8px",
    marginTop: "16px",
    textAlign: "center",
    fontSize: "14px",
    border: `1px solid ${COLORS.hairline}`,
  },
};
