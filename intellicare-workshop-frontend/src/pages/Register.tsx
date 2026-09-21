import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import { COLORS, FONT_SANS } from "../theme";

// Chỉ có đúng 1 trạm cân duy nhất cho sự kiện Workshop - khớp đúng
// DEVICE_ID trong config.h firmware (chế độ WORKSHOP_MODE).
const WORKSHOP_DEVICE_ID = "WORKSHOP_SCALE_01";

export default function Register() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axiosClient.post("/api/workshop/register", {
        fullName: fullName.trim(),
        email: email.trim(),
        deviceId: WORKSHOP_DEVICE_ID,
      });
      navigate(`/session/${res.data.sessionId}`);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại!",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.pageBackground}>
      <div style={styles.card}>
        <div style={styles.eyebrow}>IntelliCare Workshop</div>
        <h1 style={styles.title}>Đo sức khỏe miễn phí</h1>
        <p style={styles.introText}>
          Điền thông tin để nhận kết quả đo (cân nặng, chiều cao, BMI) gửi
          thẳng vào email của bạn.
        </p>

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Họ và tên</label>
          <input
            style={styles.input}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <label style={styles.label}>Email</label>
          <input
            style={styles.input}
            type="email"
            placeholder="VD: nguyenvana@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button type="submit" disabled={loading} style={styles.btnPrimary}>
            {loading ? "Đang xử lý…" : "Tiếp tục"}
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
    maxWidth: "420px",
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
    fontSize: "24px",
    fontWeight: 700,
    color: COLORS.ink,
    textAlign: "center",
    margin: "0 0 12px 0",
  },
  introText: {
    textAlign: "center",
    color: COLORS.muted,
    fontSize: "14px",
    lineHeight: 1.6,
    marginBottom: "24px",
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
    padding: "12px 14px",
    fontSize: "15px",
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
    padding: "15px",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: 700,
    color: "#ffffff",
    cursor: "pointer",
    background: COLORS.safe,
    marginTop: "24px",
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
