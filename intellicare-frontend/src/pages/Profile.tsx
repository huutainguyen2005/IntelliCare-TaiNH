import React, { useEffect, useState } from "react";
import { useCustomAuth } from "../context/AuthContext";
import axiosClient from "../api/axiosClient";

interface UserProfile {
  identifier: string;
  fullName: string;
  role: string;
  email: string;
  weightKg: number | null;
}
interface WeightLog {
  logId: number;
  weightKg: number;
  deviceId: string;
  measuredAt: string;
}

const Profile: React.FC = () => {
  const { isAuthenticated } = useCustomAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // State cho Lịch sử đo
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [showLogs, setShowLogs] = useState<boolean>(false);

  // State xử lý hiệu ứng hover nút bấm bằng React thuần
  const [isLogBtnHovered, setIsLogBtnHovered] = useState(false);

  // SỬA LỖI: Tải dữ liệu thông minh dựa theo vai trò (Role) của người đăng nhập
  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    setLoading(true);
    // Bước 1: Lấy thông tin profile trước để biết người này là ai
    axiosClient
      .get("/profile/me")
      .then((profileRes) => {
        const userData = profileRes.data;
        setProfile(userData);

        // Bước 2: CHỈ khi người đăng nhập là BỆNH NHÂN thì mới tải lịch sử đo
        if (userData?.role === "ROLE_PATIENT") {
          return axiosClient
            .get("/api/weight-logs/me")
            .then((logsRes) => {
              setLogs(logsRes.data);
            })
            .catch((err) => {
              console.error("Lỗi khi tải lịch sử đo của bệnh nhân:", err);
            });
        }
      })
      .catch((error) => {
        console.error("Lỗi hệ thống khi tải thông tin hồ sơ:", error);
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const handleToggleLogs = () => {
    setShowLogs(!showLogs);
  };

  // --- THUẬT TOÁN QUÉT RỦI RO SINH TRẮC HỌC ---
  const evaluateLogRisk = (targetLog: WeightLog, allLogs: WeightLog[]) => {
    const targetDate = new Date(targetLog.measuredAt);
    const oneWeekAgo = new Date(targetDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(
      targetDate.getTime() - 30 * 24 * 60 * 60 * 1000,
    );

    for (const log of allLogs) {
      const logDate = new Date(log.measuredAt);
      if (logDate >= targetDate) continue;

      const weightDiff = Math.abs(targetLog.weightKg - log.weightKg);
      const formattedLogDate = logDate.toLocaleDateString("vi-VN");

      if (logDate >= oneWeekAgo && weightDiff > 2) {
        return {
          isRisk: true,
          msg: `Trọng lượng thay đổi bất thường (> 2kg trong 1 tuần so với ngày ${formattedLogDate})`,
        };
      }

      if (logDate >= oneMonthAgo) {
        const fivePercentLimit = log.weightKg * 0.05;
        if (weightDiff > fivePercentLimit) {
          return {
            isRisk: true,
            msg: `Trọng lượng vượt ngưỡng an toàn (> 5% cơ thể trong 1 tháng so với ngày ${formattedLogDate})`,
          };
        }
      }
    }
    return { isRisk: false, msg: "" };
  };

  if (!isAuthenticated)
    return (
      <div style={styles.stateWrapper}>
        <div style={styles.stateCard}>
          ⚠️ Vui lòng đăng nhập hệ thống để xem thông tin
        </div>
      </div>
    );
  if (loading)
    return (
      <div style={styles.stateWrapper}>
        <div style={styles.spinner}></div>
        <div style={{ marginTop: "12px", color: "#0f766e", fontWeight: 700 }}>
          ĐANG TẢI HỒ SƠ Y TẾ...
        </div>
      </div>
    );

  const isPatient = profile?.role === "ROLE_PATIENT";

  // Xử lý mảng log hiển thị cho bệnh nhân
  const sortedLogs = [...logs].sort(
    (a, b) =>
      new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime(),
  );
  const latestVirtualLog: WeightLog | null =
    profile?.weightKg && sortedLogs.length > 0
      ? {
          logId: -1,
          weightKg: profile.weightKg,
          deviceId: "",
          measuredAt: sortedLogs[0].measuredAt,
        }
      : sortedLogs.length > 0
        ? sortedLogs[0]
        : null;

  const latestRiskStatus = latestVirtualLog
    ? evaluateLogRisk(latestVirtualLog, sortedLogs)
    : { isRisk: false, msg: "" };

  return (
    <div style={styles.pageBackground}>
      <div style={styles.container}>
        <h2 style={styles.title}>HỒ SƠ CÁ NHÂN</h2>

        <div style={styles.badgeContainer}>
          <span
            style={{
              ...styles.roleBadge,
              ...(isPatient ? styles.badgePatient : styles.badgeStaff),
            }}
          >
            {isPatient
              ? `🧬 BỆNH NHÂN - ${profile?.fullName || ""}`
              : "🩺 NHÂN VIÊN Y TẾ"}
          </span>
        </div>

        <div style={styles.infoSection}>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Họ và tên</span>
            <span style={styles.infoValue}>{profile?.fullName}</span>
          </div>

          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>
              {profile?.identifier && !profile.identifier.includes("@")
                ? "Số điện thoại"
                : "Địa chỉ Email"}
            </span>
            <span style={styles.infoValue}>
              {profile?.identifier && !profile.identifier.includes("@")
                ? profile.identifier
                : profile?.email}
            </span>
          </div>

          {/* Hiển thị thêm chức vụ hệ thống nếu KHÔNG phải là bệnh nhân */}
          {!isPatient && (
            <div style={{ ...styles.infoRow, borderBottom: "none" }}>
              <span style={styles.infoLabel}>Chức vụ hệ thống</span>
              <span
                style={{
                  ...styles.infoValue,
                  color: "#0d9488",
                  fontWeight: 700,
                }}
              >
                {profile?.role === "ROLE_DOCTOR"
                  ? "Bác sĩ chuyên khoa"
                  : profile?.role === "ROLE_NURSE"
                    ? "Điều dưỡng viên"
                    : profile?.role}
              </span>
            </div>
          )}

          {/* Chỉ render phần cảnh báo và lịch sử đo nếu đối tượng là BỆNH NHÂN */}
          {isPatient && (
            <>
              <div
                style={{
                  ...styles.weightHighlightCard,
                  ...(latestRiskStatus.isRisk
                    ? styles.weightHighlightCardDanger
                    : styles.weightHighlightCardSafe),
                }}
              >
                <span
                  style={{
                    ...styles.weightLabel,
                    color: latestRiskStatus.isRisk ? "#b91c1c" : "#0f766e",
                  }}
                >
                  {latestRiskStatus.isRisk
                    ? "⚠️ CẢNH BÁO CÂN NẶNG BẤT THƯỜNG"
                    : "Cân nặng đo gần nhất"}
                </span>
                <span
                  style={{
                    ...styles.weightValue,
                    color: latestRiskStatus.isRisk ? "#b91c1c" : "#0d9488",
                  }}
                >
                  {profile?.weightKg ? `${profile.weightKg}` : "---"}{" "}
                  <span style={{ fontSize: "20px", fontWeight: 600 }}>kg</span>
                </span>
                {latestRiskStatus.isRisk && (
                  <div style={styles.riskAlertMessage}>
                    {latestRiskStatus.msg}
                  </div>
                )}
              </div>

              <button
                onClick={handleToggleLogs}
                style={{
                  ...styles.btnLogToggle,
                  ...(isLogBtnHovered ? styles.btnLogToggleHover : {}),
                }}
                onMouseEnter={() => setIsLogBtnHovered(true)}
                onMouseLeave={() => setIsLogBtnHovered(false)}
              >
                {showLogs ? "❌ ĐÓNG LỊCH SỬ ĐO" : "📊 XEM LỊCH SỬ ĐO CHI TIẾT"}
              </button>

              {showLogs && (
                <div style={styles.logsTimelineWrapper}>
                  {sortedLogs.length > 0 ? (
                    sortedLogs.map((log) => {
                      const logRisk = evaluateLogRisk(log, sortedLogs);
                      return (
                        <div
                          key={log.logId}
                          style={{
                            ...styles.logCard,
                            ...(logRisk.isRisk
                              ? styles.logCardDanger
                              : styles.logCardNormal),
                          }}
                        >
                          <div>
                            <div style={styles.logTimeTitle}>
                              {new Date(log.measuredAt).toLocaleDateString(
                                "vi-VN",
                              )}
                              {logRisk.isRisk && (
                                <span style={styles.dangerTag}>Nguy cơ</span>
                              )}
                            </div>
                            <div style={styles.logTimeSub}>
                              {new Date(log.measuredAt).toLocaleTimeString(
                                "vi-VN",
                              )}
                            </div>
                          </div>
                          <div
                            style={{
                              ...styles.logWeightNum,
                              color: logRisk.isRisk ? "#dc2626" : "#0f766e",
                            }}
                          >
                            {log.weightKg}{" "}
                            <span style={{ fontSize: "14px", fontWeight: 700 }}>
                              kg
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p style={styles.logStatusText}>
                      📭 Chưa ghi nhận dữ liệu lịch sử cân đo nào.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  pageBackground: {
    minHeight: "calc(100vh - 70px)",
    background: "radial-gradient(circle at 50% 50%, #f0fdf4 0%, #e2e8f0 100%)",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: "50px 20px",
    boxSizing: "border-box",
    fontFamily: "'Segoe UI', Roboto, sans-serif",
  },
  container: {
    background: "rgba(255, 255, 255, 0.92)",
    backdropFilter: "blur(16px)",
    width: "100%",
    maxWidth: "600px",
    borderRadius: "32px",
    padding: "40px",
    boxSizing: "border-box",
    boxShadow: "0 20px 50px -12px rgba(15, 23, 42, 0.08)",
    border: "1px solid rgba(255, 255, 255, 0.6)",
    textAlign: "center",
  },
  title: {
    fontSize: "26px",
    fontWeight: 900,
    margin: "0 0 16px 0",
    letterSpacing: "0.5px",
    background: "linear-gradient(135deg, #0f766e 0%, #059669 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  badgeContainer: {
    marginBottom: "30px",
  },
  roleBadge: {
    padding: "6px 16px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 800,
    letterSpacing: "0.5px",
  },
  badgePatient: {
    background: "rgba(13, 148, 136, 0.1)",
    color: "#0f766e",
    border: "1px solid rgba(13, 148, 136, 0.2)",
  },
  badgeStaff: {
    background: "rgba(5, 150, 105, 0.1)",
    color: "#059669",
    border: "1px solid rgba(5, 150, 105, 0.2)",
  },
  infoSection: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "24px",
    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.02)",
    border: "1px solid #f1f5f9",
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 0",
    borderBottom: "1px solid #f1f5f9",
    boxSizing: "border-box",
  },
  infoLabel: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  infoValue: {
    fontSize: "15px",
    fontWeight: 600,
    color: "#0f172a",
  },
  weightHighlightCard: {
    padding: "24px",
    borderRadius: "20px",
    marginTop: "24px",
    textAlign: "center",
    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.01)",
    transition: "all 0.3s ease",
  },
  weightHighlightCardSafe: {
    background: "linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)",
    border: "1px solid rgba(13, 148, 136, 0.2)",
  },
  weightHighlightCardDanger: {
    background: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
    border: "2px solid #ef4444",
  },
  weightLabel: {
    display: "block",
    fontSize: "13px",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "6px",
  },
  weightValue: {
    fontSize: "42px",
    fontWeight: 900,
    lineHeight: 1,
  },
  riskAlertMessage: {
    color: "#991b1b",
    fontSize: "13px",
    marginTop: "12px",
    fontWeight: 600,
    fontStyle: "italic",
    lineHeight: 1.4,
  },
  btnLogToggle: {
    width: "100%",
    padding: "14px",
    background: "transparent",
    border: "2px solid #0d9488",
    color: "#0d9488",
    borderRadius: "14px",
    fontSize: "14px",
    fontWeight: 800,
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontFamily: "'Segoe UI', Roboto, sans-serif",
    marginTop: "20px",
    letterSpacing: "0.5px",
  },
  btnLogToggleHover: {
    background: "rgba(13, 148, 136, 0.05)",
    transform: "translateY(-0.5px)",
  },
  logsTimelineWrapper: {
    marginTop: "24px",
    borderTop: "2px dashed #e2e8f0",
    paddingTop: "24px",
    maxHeight: "350px",
    overflowY: "auto",
  },
  logCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    borderRadius: "14px",
    marginBottom: "12px",
    boxSizing: "border-box",
  },
  logCardNormal: {
    background: "#f8fafc",
    borderLeft: "4px solid #0d9488",
    borderTop: "1px solid #e2e8f0",
    borderRight: "1px solid #e2e8f0",
    borderBottom: "1px solid #e2e8f0",
  },
  logCardDanger: {
    background: "#fef2f2",
    borderLeft: "4px solid #ef4444",
    borderTop: "1px solid #fee2e2",
    borderRight: "1px solid #fee2e2",
    borderBottom: "1px solid #fee2e2",
  },
  logTimeTitle: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#1e293b",
    textAlign: "left",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  dangerTag: {
    fontSize: "11px",
    padding: "2px 6px",
    backgroundColor: "#ef4444",
    color: "#ffffff",
    borderRadius: "4px",
    fontWeight: 700,
  },
  logTimeSub: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#94a3b8",
    textAlign: "left",
    marginTop: "2px",
  },
  logWeightNum: {
    fontSize: "22px",
    fontWeight: 900,
  },
  logStatusText: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#64748b",
    margin: "20px 0",
  },
  stateWrapper: {
    minHeight: "calc(100vh - 70px)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "'Segoe UI', Roboto, sans-serif",
    background: "#f8fafc",
  },
  stateCard: {
    background: "#fff5f5",
    border: "1px solid #fee2e2",
    color: "#b91c1c",
    padding: "16px 24px",
    borderRadius: "16px",
    fontWeight: 600,
    boxShadow: "0 4px 12px rgba(220, 38, 38, 0.02)",
  },
  spinner: {
    width: "32px",
    height: "32px",
    border: "4px solid #e2e8f0",
    borderTop: "4px solid #0d9488",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
};

export default Profile;
