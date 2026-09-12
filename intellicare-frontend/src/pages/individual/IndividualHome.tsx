import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import Modal from "../../components/Modal";
import { useCustomAuth } from "../../context/AuthContext";

interface WeightLog {
  logId: number;
  weightKg: number;
  measuredAt: string;
}

// Trang chính của Người dùng cá nhân (Nhóm 3) - đo cân + xem lịch sử.
// KHÔNG dùng state machine AwaitingStart->Pending->Completed như Bệnh
// viện/Trường học - vì đây là 1 người tự cân tại nhà riêng, không có rủi
// ro "nhầm người đang đứng trên cân" nên ghi nhận trực tiếp.
//
// GIAI ĐOẠN NÀY: chưa tích hợp cân BLE thật (Xiaomi S400) - người dùng tự
// nhập số cân đọc được từ cân nhà mình. Khi tích hợp BLE (Giai đoạn 3
// trong lộ trình), ô nhập tay này sẽ thay bằng luồng ghép nối Bluetooth tự
// động, không cần đổi API /submit vì cấu trúc dữ liệu vẫn như cũ.
export default function IndividualHome() {
  const { user, logout } = useCustomAuth();
  const navigate = useNavigate();
  const [weightInput, setWeightInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const formatDate = (dateInput: string): string => {
    const d = new Date(dateInput);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${d.getFullYear()} ${hh}:${mm}`;
  };

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    message: string;
    type: "success" | "error" | "warning";
  }>({ isOpen: false, message: "", type: "warning" });
  const showModal = (message: string, type: "success" | "error" | "warning") =>
    setModalConfig({ isOpen: true, message, type });

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await axiosClient.get("/api/individual-measurements/history");
      setLogs(res.data);
    } catch (error) {
      console.error("Lỗi khi tải lịch sử:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSubmitWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    const weightKg = Number(weightInput);
    if (!weightKg || weightKg <= 0) {
      showModal("Vui lòng nhập số cân hợp lệ!", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      await axiosClient.post("/api/individual-measurements/submit", {
        weightKg,
      });
      setWeightInput("");
      showModal("Đã lưu kết quả cân!", "success");
      fetchHistory();
    } catch (error: any) {
      showModal(
        error.response?.data?.message || "Không thể ghi nhận cân nặng!",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const latest = logs.length > 0 ? logs[0] : null;
  const trend = logs.length > 1 ? logs[0].weightKg - logs[1].weightKg : null;

  return (
    <div style={styles.pageBackground}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.eyebrow}>Theo dõi cân nặng cá nhân</div>
          <h1 style={styles.patientName}>{user?.fullName}</h1>
        </header>

        {/* ===== Ô ĐỌC SỐ - đúng pattern hệ thống ===== */}
        <div style={styles.readout}>
          <div style={styles.readoutLabel}>Chỉ số gần nhất</div>
          <div style={styles.readoutValue}>
            {latest ? latest.weightKg.toFixed(2) : "—"}
            <span style={styles.readoutUnit}>kg</span>
          </div>
          {trend !== null && (
            <p style={styles.trendText}>
              {trend > 0 ? "▲" : trend < 0 ? "▼" : "–"}{" "}
              {Math.abs(trend).toFixed(2)} kg so với lần đo trước
            </p>
          )}
        </div>

        {/* ===== NHẬP SỐ CÂN MỚI ===== */}
        <form onSubmit={handleSubmitWeight} style={styles.submitRow}>
          <input
            style={styles.weightInput}
            type="number"
            step="0.01"
            placeholder="Nhập số cân đo được (kg)"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            style={styles.btnSubmit}
          >
            {isSubmitting ? "Đang lưu…" : "Ghi nhận"}
          </button>
        </form>

        {/* ===== LỊCH SỬ ===== */}
        <div style={styles.historySection}>
          <h2 style={styles.sectionTitle}>Lịch sử đo</h2>
          {isLoading ? (
            <p style={styles.stateText}>Đang tải…</p>
          ) : logs.length === 0 ? (
            <p style={styles.stateText}>Chưa có dữ liệu đo nào.</p>
          ) : (
            <div style={styles.historyList}>
              {logs.map((log) => (
                <div key={log.logId} style={styles.historyRow}>
                  <span style={styles.historyDate}>
                    {formatDate(log.measuredAt)}
                  </span>
                  <span style={styles.historyWeight}>
                    {log.weightKg.toFixed(2)} kg
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          style={styles.logoutButton}
          onClick={() => {
            logout();
            navigate("/individual/auth");
          }}
        >
          Đăng xuất
        </button>
      </div>

      <Modal
        isOpen={modalConfig.isOpen}
        message={modalConfig.message}
        type={modalConfig.type}
        onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
      />
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
const FONT_SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const FONT_NUMBER =
  "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const styles: { [key: string]: React.CSSProperties } = {
  pageBackground: {
    width: "100%",
    minHeight: "calc(100vh - 80px)",
    background: COLORS.paper,
    display: "flex",
    justifyContent: "center",
    padding: "56px 20px",
    boxSizing: "border-box",
    fontFamily: FONT_SANS,
  },
  container: { width: "100%", maxWidth: "560px" },
  header: {
    borderBottom: `1px solid ${COLORS.hairline}`,
    paddingBottom: "18px",
    marginBottom: "28px",
  },
  eyebrow: {
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: COLORS.muted,
    marginBottom: "8px",
  },
  patientName: {
    fontSize: "26px",
    fontWeight: 700,
    color: COLORS.ink,
    margin: 0,
  },
  readout: {
    background: COLORS.paperRaised,
    border: `1px solid ${COLORS.hairline}`,
    borderTop: `3px solid ${COLORS.safe}`,
    borderRadius: "8px",
    padding: "26px",
    marginBottom: "20px",
    textAlign: "center",
  },
  readoutLabel: {
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: COLORS.muted,
    marginBottom: "8px",
  },
  readoutValue: {
    fontFamily: FONT_NUMBER,
    fontSize: "clamp(44px, 12vw, 56px)",
    fontWeight: 700,
    color: COLORS.ink,
    lineHeight: 1,
  },
  readoutUnit: {
    fontSize: "20px",
    fontWeight: 600,
    marginLeft: "6px",
    color: COLORS.muted,
  },
  trendText: {
    fontSize: "13px",
    color: COLORS.muted,
    marginTop: "12px",
  },
  submitRow: {
    display: "flex",
    gap: "10px",
    marginBottom: "32px",
  },
  weightInput: {
    flex: 1,
    padding: "12px 14px",
    borderRadius: "8px",
    border: `1px solid ${COLORS.hairline}`,
    fontSize: "15px",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: FONT_SANS,
    color: COLORS.ink,
    background: COLORS.paperRaised,
  },
  btnSubmit: {
    padding: "12px 22px",
    background: COLORS.safe,
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: FONT_SANS,
    whiteSpace: "nowrap",
  },
  historySection: { marginBottom: "24px" },
  sectionTitle: {
    fontSize: "15px",
    fontWeight: 700,
    color: COLORS.ink,
    marginBottom: "12px",
  },
  stateText: { color: COLORS.muted, fontSize: "14px" },
  historyList: {},
  historyRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "12px 0",
    borderBottom: `1px solid ${COLORS.hairline}`,
  },
  historyDate: {
    fontFamily: FONT_NUMBER,
    fontSize: "14px",
    color: COLORS.muted,
  },
  historyWeight: {
    fontFamily: FONT_NUMBER,
    fontSize: "15px",
    fontWeight: 700,
    color: COLORS.ink,
  },
  logoutButton: {
    width: "100%",
    padding: "12px",
    background: "transparent",
    color: COLORS.risk,
    border: `1px solid ${COLORS.risk}`,
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: FONT_SANS,
    marginTop: "12px",
  },
};
