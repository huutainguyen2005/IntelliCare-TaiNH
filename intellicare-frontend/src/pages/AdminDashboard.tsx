import { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";

interface StaleActivation {
  patientId: number;
  fullName: string;
  phoneNumber: string;
  createdAt: string;
  daysSinceCreated: number;
}

interface DashboardStats {
  totalPatients: number;
  activatedPatients: number;
  pendingPatients: number;
  activationRatePercent: number;
  avgActivationHours: number | null;
  lockedPatients: number;
  staleActivations: StaleActivation[];
  totalStaff: number;
  totalDoctors: number;
  totalNurses: number;
  activeStaff: number;
  lockedStaff: number;
  totalDevices: number;
  activeDevices: number;
  measurementsToday: number;
  measurementsThisWeek: number;
  measurementsThisMonth: number;
  totalWeightLogsAllTime: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const formatDate = (dateInput: string): string => {
    const d = new Date(dateInput);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${d.getFullYear()}`;
  };

  const formatDuration = (hours: number | null): string => {
    if (hours === null) return "Chưa có dữ liệu";
    if (hours < 1) return `${Math.round(hours * 60)} phút`;
    if (hours < 24) return `${hours.toFixed(1)} giờ`;
    return `${(hours / 24).toFixed(1)} ngày`;
  };

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const res = await axiosClient.get("/api/dashboard/summary");
        setStats(res.data);
      } catch (err) {
        console.error("Lỗi khi tải số liệu Dashboard:", err);
        setError("Không thể tải số liệu. Vui lòng thử lại!");
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div style={styles.pageBackground}>
        <p style={styles.stateText}>Đang tải số liệu…</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div style={styles.pageBackground}>
        <p style={{ ...styles.stateText, color: COLORS.risk }}>
          {error || "Có lỗi xảy ra."}
        </p>
      </div>
    );
  }

  return (
    <div style={styles.pageBackground}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.eyebrow}>Tổng quan</div>
          <h1 style={styles.pageTitle}>Tổng quan hệ thống</h1>
        </header>

        {/* ===== TỶ LỆ KÍCH HOẠT - ô đọc số chính, đúng pattern hệ thống ===== */}
        <div style={styles.readout}>
          <div style={styles.readoutLabel}>Tỷ lệ bệnh nhân đã kích hoạt</div>
          <div style={styles.readoutValue}>
            {stats.activationRatePercent}
            <span style={styles.readoutUnit}>%</span>
          </div>
          <div style={styles.progressTrack}>
            <div
              style={{
                ...styles.progressFill,
                width: `${stats.activationRatePercent}%`,
              }}
            />
          </div>
          <div style={styles.readoutBreakdown}>
            <span>
              Đã kích hoạt: <b>{stats.activatedPatients}</b>
            </span>
            <span style={styles.metaDivider}>·</span>
            <span>
              Chưa kích hoạt: <b>{stats.pendingPatients}</b>
            </span>
            <span style={styles.metaDivider}>·</span>
            <span>
              Tổng: <b>{stats.totalPatients}</b>
            </span>
          </div>
          <div style={styles.readoutFootnote}>
            Thời gian trung bình từ lúc đo đến lúc kích hoạt:{" "}
            <b>{formatDuration(stats.avgActivationHours)}</b>
          </div>
        </div>

        {/* ===== LƯỚI SỐ LIỆU - dạng bảng kẻ mảnh, không phải bento-card ===== */}
        <div style={styles.statsGrid}>
          <div style={styles.statCell}>
            <div style={styles.statLabel}>Hồ sơ bệnh nhân bị khóa</div>
            <div style={styles.statValue}>{stats.lockedPatients}</div>
          </div>
          <div style={styles.statCell}>
            <div style={styles.statLabel}>Bác sĩ / Y tá</div>
            <div style={styles.statValue}>{stats.totalStaff}</div>
            <div style={styles.statSubText}>
              {stats.totalDoctors} Bác sĩ · {stats.totalNurses} Y tá ·{" "}
              {stats.lockedStaff} bị khóa
            </div>
          </div>
          <div style={styles.statCell}>
            <div style={styles.statLabel}>Thiết bị cân</div>
            <div style={styles.statValue}>
              {stats.activeDevices}/{stats.totalDevices}
            </div>
            <div style={styles.statSubText}>đang hoạt động</div>
          </div>
          <div style={styles.statCell}>
            <div style={styles.statLabel}>Lượt đo hôm nay</div>
            <div style={styles.statValue}>{stats.measurementsToday}</div>
          </div>
          <div style={styles.statCell}>
            <div style={styles.statLabel}>Lượt đo tuần này</div>
            <div style={styles.statValue}>{stats.measurementsThisWeek}</div>
          </div>
          <div style={styles.statCell}>
            <div style={styles.statLabel}>Lượt đo tháng này</div>
            <div style={styles.statValue}>{stats.measurementsThisMonth}</div>
          </div>
        </div>

        {/* ===== DANH SÁCH CÓ NGUY CƠ BỎ CUỘC ===== */}
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>
            Bệnh nhân có nguy cơ bỏ dở kích hoạt
          </h2>
          <p style={styles.sectionHint}>
            Đã đo tại Kiosk hơn 3 ngày nhưng vẫn chưa kích hoạt tài khoản — 20
            trường hợp lâu nhất.
          </p>
        </div>

        {stats.staleActivations.length === 0 ? (
          <p style={styles.stateText}>Không có trường hợp nào đáng lo ngại.</p>
        ) : (
          <div style={styles.table}>
            <div style={styles.tableHeadRow}>
              <span>Bệnh nhân</span>
              <span>Số ngày chưa kích hoạt</span>
            </div>
            {stats.staleActivations.map((p) => (
              <div key={p.patientId} style={styles.tableRow}>
                <div style={styles.rowMainCol}>
                  <span style={styles.rowName}>{p.fullName}</span>
                  <span style={styles.rowMeta}>
                    {p.phoneNumber} · Đo ngày {formatDate(p.createdAt)}
                  </span>
                </div>
                <span style={styles.staleDaysTag}>
                  {p.daysSinceCreated} ngày
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
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

const styles: Record<string, React.CSSProperties> = {
  pageBackground: {
    minHeight: "calc(100vh - 80px)",
    background: COLORS.paper,
    padding: "48px 20px",
    fontFamily: FONT_SANS,
    boxSizing: "border-box",
  },
  container: {
    maxWidth: "800px",
    margin: "0 auto",
  },
  header: {
    borderBottom: `1px solid ${COLORS.hairline}`,
    paddingBottom: "18px",
    marginBottom: "24px",
  },
  eyebrow: {
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: COLORS.muted,
    marginBottom: "6px",
  },
  pageTitle: {
    fontSize: "26px",
    fontWeight: 700,
    color: COLORS.ink,
    margin: 0,
  },
  stateText: {
    textAlign: "center",
    color: COLORS.muted,
    fontSize: "15px",
    padding: "40px 0",
  },

  // ===== Ô ĐỌC SỐ CHÍNH =====
  readout: {
    background: COLORS.paperRaised,
    border: `1px solid ${COLORS.hairline}`,
    borderTop: `3px solid ${COLORS.safe}`,
    borderRadius: "8px",
    padding: "28px",
    marginBottom: "32px",
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
    fontSize: "clamp(40px, 8vw, 56px)",
    fontWeight: 700,
    color: COLORS.ink,
    lineHeight: 1,
    marginBottom: "16px",
  },
  readoutUnit: {
    fontSize: "24px",
    fontWeight: 600,
    marginLeft: "4px",
    color: COLORS.muted,
  },
  progressTrack: {
    width: "100%",
    height: "6px",
    borderRadius: "3px",
    background: COLORS.paper,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: COLORS.safe,
    borderRadius: "3px",
    transition: "width 0.4s ease",
  },
  readoutBreakdown: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginTop: "16px",
    fontSize: "13px",
    color: COLORS.ink,
  },
  metaDivider: {
    color: COLORS.hairline,
  },
  readoutFootnote: {
    marginTop: "14px",
    paddingTop: "14px",
    borderTop: `1px solid ${COLORS.hairline}`,
    fontSize: "13px",
    color: COLORS.muted,
  },

  // ===== LƯỚI SỐ LIỆU =====
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    border: `1px solid ${COLORS.hairline}`,
    borderRadius: "8px",
    overflow: "hidden",
    marginBottom: "36px",
  },
  statCell: {
    background: COLORS.paperRaised,
    padding: "18px",
    borderRight: `1px solid ${COLORS.hairline}`,
    borderBottom: `1px solid ${COLORS.hairline}`,
  },
  statLabel: {
    fontSize: "13px",
    fontWeight: 600,
    color: COLORS.muted,
    marginBottom: "8px",
  },
  statValue: {
    fontFamily: FONT_NUMBER,
    fontSize: "26px",
    fontWeight: 700,
    color: COLORS.ink,
  },
  statSubText: {
    fontSize: "12px",
    color: COLORS.muted,
    marginTop: "4px",
  },

  // ===== DANH SÁCH RỦI RO =====
  sectionHeader: {
    marginBottom: "8px",
  },
  sectionTitle: {
    fontSize: "17px",
    fontWeight: 700,
    color: COLORS.ink,
    margin: "0 0 4px 0",
  },
  sectionHint: {
    fontSize: "13px",
    color: COLORS.muted,
    margin: 0,
  },
  table: {
    borderTop: `1px solid ${COLORS.hairline}`,
    marginTop: "16px",
  },
  tableHeadRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: COLORS.muted,
    padding: "10px 0",
  },
  tableRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 0",
    borderBottom: `1px solid ${COLORS.hairline}`,
    gap: "16px",
  },
  rowMainCol: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    minWidth: 0,
  },
  rowName: {
    fontSize: "15px",
    fontWeight: 600,
    color: COLORS.ink,
  },
  rowMeta: {
    fontSize: "13px",
    color: COLORS.muted,
  },
  staleDaysTag: {
    fontFamily: FONT_NUMBER,
    fontSize: "13px",
    fontWeight: 700,
    color: COLORS.risk,
    border: `1px solid ${COLORS.risk}`,
    borderRadius: "6px",
    padding: "4px 10px",
    whiteSpace: "nowrap",
  },
};
