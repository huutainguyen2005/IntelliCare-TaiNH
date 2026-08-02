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
        <p style={styles.loadingText}>Đang tải số liệu...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div style={styles.pageBackground}>
        <p style={styles.errorText}>{error || "Có lỗi xảy ra."}</p>
      </div>
    );
  }

  return (
    <div style={styles.pageBackground}>
      <div style={styles.container}>
        <h2 style={styles.title}>TỔNG QUAN HỆ THỐNG</h2>

        {/* ===== TỶ LỆ KÍCH HOẠT - trọng tâm chính ===== */}
        <div style={styles.heroCard}>
          <div style={styles.heroLabel}>TỶ LỆ BỆNH NHÂN ĐÃ KÍCH HOẠT</div>
          <div style={styles.heroValue}>{stats.activationRatePercent}%</div>
          <div style={styles.progressBarTrack}>
            <div
              style={{
                ...styles.progressBarFill,
                width: `${stats.activationRatePercent}%`,
              }}
            />
          </div>
          <div style={styles.heroBreakdown}>
            <span>
              ✅ Đã kích hoạt: <b>{stats.activatedPatients}</b>
            </span>
            <span>
              ⏳ Chưa kích hoạt: <b>{stats.pendingPatients}</b>
            </span>
            <span>
              📋 Tổng: <b>{stats.totalPatients}</b>
            </span>
          </div>
          <div style={styles.heroSubText}>
            Thời gian trung bình từ lúc đo đến lúc kích hoạt:{" "}
            <b>{formatDuration(stats.avgActivationHours)}</b>
          </div>
        </div>

        {/* ===== LƯỚI THẺ SỐ LIỆU ===== */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>🔒 Hồ sơ bệnh nhân bị khóa</div>
            <div style={styles.statValue}>{stats.lockedPatients}</div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statLabel}>🩺 Bác sĩ / Y tá</div>
            <div style={styles.statValue}>{stats.totalStaff}</div>
            <div style={styles.statSubText}>
              {stats.totalDoctors} Bác sĩ · {stats.totalNurses} Y tá ·{" "}
              {stats.lockedStaff} bị khóa
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statLabel}>⚖️ Thiết bị cân</div>
            <div style={styles.statValue}>
              {stats.activeDevices}/{stats.totalDevices}
            </div>
            <div style={styles.statSubText}>đang hoạt động</div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statLabel}>📈 Lượt đo hôm nay</div>
            <div style={styles.statValue}>{stats.measurementsToday}</div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statLabel}>📊 Lượt đo tuần này</div>
            <div style={styles.statValue}>{stats.measurementsThisWeek}</div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statLabel}>🗓️ Lượt đo tháng này</div>
            <div style={styles.statValue}>{stats.measurementsThisMonth}</div>
          </div>
        </div>

        {/* ===== DANH SÁCH CÓ NGUY CƠ BỎ CUỘC ===== */}
        <h3 style={styles.sectionTitle}>
          ⚠️ Bệnh nhân có nguy cơ bỏ dở kích hoạt
        </h3>
        <p style={styles.sectionHint}>
          Đã đo tại Kiosk hơn 3 ngày nhưng vẫn chưa kích hoạt tài khoản — danh
          sách 20 trường hợp lâu nhất.
        </p>

        {stats.staleActivations.length === 0 ? (
          <p style={styles.emptyText}>
            🎉 Không có trường hợp nào đáng lo ngại.
          </p>
        ) : (
          <div style={{ marginTop: "12px" }}>
            {stats.staleActivations.map((p) => (
              <div key={p.patientId} style={styles.staleCard}>
                <div>
                  <div style={styles.staleName}>{p.fullName}</div>
                  <div style={styles.staleMeta}>
                    {p.phoneNumber} · Đo ngày {formatDate(p.createdAt)}
                  </div>
                </div>
                <div style={styles.staleDaysTag}>{p.daysSinceCreated} ngày</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageBackground: {
    minHeight: "calc(100vh - 80px)",
    background: "var(--bg)",
    padding: "30px 20px",
    fontFamily: "'Segoe UI', Roboto, sans-serif",
  },
  container: {
    maxWidth: "900px",
    margin: "0 auto",
  },
  title: {
    fontSize: "22px",
    fontWeight: 800,
    color: "#0f172a",
    marginBottom: "20px",
  },
  loadingText: {
    textAlign: "center",
    color: "#64748b",
    marginTop: "60px",
  },
  errorText: {
    textAlign: "center",
    color: "#ef4444",
    marginTop: "60px",
    fontWeight: 600,
  },
  heroCard: {
    background: "linear-gradient(135deg, #0d9488 0%, #059669 100%)",
    borderRadius: "24px",
    padding: "30px",
    color: "#ffffff",
    boxShadow: "0 10px 25px -5px rgba(13, 148, 136, 0.3)",
    marginBottom: "24px",
  },
  heroLabel: {
    fontSize: "13px",
    fontWeight: 700,
    letterSpacing: "0.5px",
    opacity: 0.9,
  },
  heroValue: {
    fontSize: "48px",
    fontWeight: 900,
    margin: "6px 0 16px 0",
  },
  progressBarTrack: {
    width: "100%",
    height: "10px",
    borderRadius: "10px",
    background: "rgba(255,255,255,0.25)",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    background: "#ffffff",
    borderRadius: "10px",
    transition: "width 0.4s ease",
  },
  heroBreakdown: {
    display: "flex",
    gap: "20px",
    flexWrap: "wrap",
    marginTop: "16px",
    fontSize: "13px",
  },
  heroSubText: {
    marginTop: "14px",
    fontSize: "13px",
    opacity: 0.95,
    borderTop: "1px solid rgba(255,255,255,0.25)",
    paddingTop: "12px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "14px",
    marginBottom: "30px",
  },
  statCard: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "18px",
    border: "1px solid #e2e8f0",
  },
  statLabel: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#64748b",
    marginBottom: "8px",
  },
  statValue: {
    fontSize: "26px",
    fontWeight: 900,
    color: "#0f172a",
  },
  statSubText: {
    fontSize: "12px",
    color: "#94a3b8",
    marginTop: "4px",
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: 800,
    color: "#0f172a",
    marginBottom: "4px",
  },
  sectionHint: {
    fontSize: "13px",
    color: "#64748b",
    marginBottom: "8px",
  },
  emptyText: {
    textAlign: "center",
    color: "#64748b",
    marginTop: "20px",
    fontStyle: "italic",
  },
  staleCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: "14px",
    padding: "14px 18px",
    marginBottom: "10px",
  },
  staleName: {
    fontSize: "15px",
    fontWeight: 700,
    color: "#0f172a",
  },
  staleMeta: {
    fontSize: "12px",
    color: "#78716c",
    marginTop: "2px",
  },
  staleDaysTag: {
    background: "#f59e0b",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: 800,
    padding: "6px 12px",
    borderRadius: "10px",
  },
};
