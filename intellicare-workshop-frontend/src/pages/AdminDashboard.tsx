import React, { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
import { useAdminAuth } from "../context/AdminAuthContext";
import { COLORS, FONT_SANS, FONT_NUMBER } from "../theme";

interface DashboardStats {
  totalParticipants: number;
  completedCount: number;
  pendingCount: number;
  avgWeightKg: number | null;
  avgHeightCm: number | null;
  avgBmi: number | null;
}

export default function AdminDashboard() {
  const { username, logout } = useAdminAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");

  const fetchStats = async () => {
    try {
      const res = await axiosClient.get("/api/workshop/admin/dashboard");
      setStats(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Không thể tải số liệu");
    }
  };

  useEffect(() => {
    fetchStats();
    // Tự làm mới mỗi 5 giây - phù hợp xem trực tiếp trong lúc sự kiện đang diễn ra
    const intervalId = setInterval(fetchStats, 5000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div style={styles.pageBackground}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <div style={styles.eyebrow}>Xin chào, {username}</div>
            <h1 style={styles.pageTitle}>Tổng quan Workshop</h1>
          </div>
          <button style={styles.logoutButton} onClick={logout}>
            Đăng xuất
          </button>
        </header>

        {error && <p style={{ color: COLORS.risk }}>{error}</p>}

        {stats && (
          <>
            <div style={styles.statsGrid}>
              <div style={styles.statCell}>
                <div style={styles.statLabel}>Tổng số người tham gia</div>
                <div style={styles.statValue}>{stats.totalParticipants}</div>
              </div>
              <div style={styles.statCell}>
                <div style={styles.statLabel}>Đã đo xong</div>
                <div style={styles.statValue}>{stats.completedCount}</div>
              </div>
              <div style={styles.statCell}>
                <div style={styles.statLabel}>Đang chờ / đang đo</div>
                <div style={styles.statValue}>{stats.pendingCount}</div>
              </div>
            </div>

            <h2 style={styles.sectionTitle}>Trung bình (những người đã đo)</h2>
            <div style={styles.statsGrid}>
              <div style={styles.statCell}>
                <div style={styles.statLabel}>Cân nặng TB</div>
                <div style={styles.statValue}>
                  {stats.avgWeightKg != null
                    ? `${stats.avgWeightKg.toFixed(1)} kg`
                    : "—"}
                </div>
              </div>
              <div style={styles.statCell}>
                <div style={styles.statLabel}>Chiều cao TB</div>
                <div style={styles.statValue}>
                  {stats.avgHeightCm != null
                    ? `${stats.avgHeightCm.toFixed(0)} cm`
                    : "—"}
                </div>
              </div>
              <div style={styles.statCell}>
                <div style={styles.statLabel}>BMI TB</div>
                <div style={styles.statValue}>
                  {stats.avgBmi != null ? stats.avgBmi.toFixed(1) : "—"}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  pageBackground: {
    minHeight: "100vh",
    background: COLORS.paper,
    padding: "48px 20px",
    fontFamily: FONT_SANS,
    boxSizing: "border-box",
  },
  container: { maxWidth: "700px", margin: "0 auto" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottom: `1px solid ${COLORS.hairline}`,
    paddingBottom: "18px",
    marginBottom: "28px",
    gap: "16px",
    flexWrap: "wrap",
  },
  eyebrow: {
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: COLORS.muted,
    marginBottom: "6px",
  },
  pageTitle: { fontSize: "24px", fontWeight: 700, color: COLORS.ink, margin: 0 },
  logoutButton: {
    padding: "9px 18px",
    background: "transparent",
    color: COLORS.risk,
    border: `1px solid ${COLORS.risk}`,
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: FONT_SANS,
  },
  sectionTitle: {
    fontSize: "15px",
    fontWeight: 700,
    color: COLORS.ink,
    margin: "28px 0 12px 0",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    border: `1px solid ${COLORS.hairline}`,
    borderRadius: "8px",
    overflow: "hidden",
  },
  statCell: {
    background: COLORS.paperRaised,
    padding: "18px",
    borderRight: `1px solid ${COLORS.hairline}`,
    borderBottom: `1px solid ${COLORS.hairline}`,
  },
  statLabel: {
    fontSize: "12px",
    fontWeight: 600,
    color: COLORS.muted,
    marginBottom: "8px",
  },
  statValue: {
    fontFamily: FONT_NUMBER,
    fontSize: "24px",
    fontWeight: 700,
    color: COLORS.ink,
  },
};
