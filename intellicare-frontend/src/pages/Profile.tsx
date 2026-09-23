import React, { useEffect, useState } from "react";
import { useCustomAuth } from "../context/AuthContext";
import axiosClient from "../api/axiosClient";
import { formatWeight } from "../utils/weightAudio";

interface UserProfile {
  identifier: string;
  fullName: string;
  role: string;
  email: string;
  weightKg: number | null;
  faceImageUrl: string | null;
}
interface WeightLog {
  logId: number;
  weightKg: number;
  deviceId: string;
  measuredAt: string;
}

const Profile: React.FC = () => {
  const formatDate = (dateInput: string | Date): string => {
    const d = new Date(dateInput);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${d.getFullYear()}`;
  };

  const { isAuthenticated } = useCustomAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [showLogs, setShowLogs] = useState<boolean>(false);
  const [logPage, setLogPage] = useState<number>(1);
  const LOGS_PER_PAGE = 5;

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    setLoading(true);
    axiosClient
      .get("/profile/me")
      .then((profileRes) => {
        const userData = profileRes.data;
        setProfile(userData);

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
    setLogPage(1);
  };

  // --- THUẬT TOÁN QUÉT RỦI RO SINH TRẮC HỌC (giữ nguyên, không đổi) ---
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
      const formattedLogDate = formatDate(logDate);

      if (logDate >= oneWeekAgo && weightDiff > 2) {
        return {
          isRisk: true,
          msg: `Thay đổi hơn 2kg trong 1 tuần so với ${formattedLogDate}`,
        };
      }

      if (logDate >= oneMonthAgo) {
        const fivePercentLimit = log.weightKg * 0.05;
        if (weightDiff > fivePercentLimit) {
          return {
            isRisk: true,
            msg: `Thay đổi quá 5% cân nặng trong 1 tháng so với ${formattedLogDate}`,
          };
        }
      }
    }
    return { isRisk: false, msg: "" };
  };

  if (!isAuthenticated)
    return (
      <div style={styles.stateWrapper}>
        <div style={styles.stateCard}>Vui lòng đăng nhập để xem hồ sơ.</div>
      </div>
    );
  if (loading)
    return (
      <div style={styles.stateWrapper}>
        <div style={styles.spinner}></div>
        <div style={styles.loadingText}>Đang tải hồ sơ...</div>
      </div>
    );

  const isPatient = profile?.role === "ROLE_PATIENT";

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

  const totalPages = Math.max(1, Math.ceil(sortedLogs.length / LOGS_PER_PAGE));
  const pagedLogs = sortedLogs.slice(
    (logPage - 1) * LOGS_PER_PAGE,
    logPage * LOGS_PER_PAGE,
  );

  return (
    <div style={styles.pageBackground}>
      <div style={styles.container}>
        {/* ===== ĐẦU HỒ SƠ - như đầu 1 bệnh án, không phải badge trang trí ===== */}
        <header style={styles.header}>
          <div style={styles.headerTopRow}>
            {profile?.faceImageUrl ? (
              <img src={profile.faceImageUrl} alt="" style={styles.avatar} />
            ) : (
              <div style={styles.avatarPlaceholder}>
                {profile?.fullName?.charAt(0) || "?"}
              </div>
            )}
            <div>
              <div style={styles.eyebrow}>
                {isPatient ? "Hồ sơ bệnh nhân" : "Hồ sơ nhân viên y tế"}
              </div>
              <h1 style={styles.patientName}>{profile?.fullName}</h1>
              <div style={styles.headerMetaRow}>
                <span style={styles.headerMetaItem}>
                  {isPatient
                    ? profile?.identifier && !profile.identifier.includes("@")
                      ? `Số điện thoại: ${profile.identifier}`
                      : `Email: ${profile?.email}`
                    : `Tài khoản: ${profile?.identifier}`}
                </span>
                {!isPatient && (
                  <>
                    <span style={styles.metaDivider}>·</span>
                    <span style={styles.headerMetaItem}>
                      Chức danh nghề nghiệp:{" "}
                      {profile?.role === "DOCTOR"
                        ? "Bác sĩ chuyên khoa"
                        : profile?.role === "NURSE"
                          ? "Điều dưỡng viên"
                          : profile?.role}
                    </span>
                  </>
                )}
                {isPatient && profile?.email && (
                  <>
                    <span style={styles.metaDivider}>·</span>
                    <span style={styles.headerMetaItem}>
                      Email: {profile.email}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {isPatient && (
          <>
            {/* ===== Ô ĐỌC SỐ - signature element, kiểu màn hình máy đo ===== */}
            <div
              style={{
                ...styles.readout,
                borderTopColor: latestRiskStatus.isRisk
                  ? COLORS.risk
                  : COLORS.safe,
              }}
            >
              <div style={styles.readoutLabel}>
                {latestRiskStatus.isRisk
                  ? "Cảnh báo chỉ số bất thường"
                  : "Chỉ số gần nhất"}
              </div>
              <div
                style={{
                  ...styles.readoutValue,
                  color: latestRiskStatus.isRisk ? COLORS.risk : COLORS.ink,
                }}
              >
                {profile?.weightKg ? formatWeight(profile.weightKg) : "—"}
                <span style={styles.readoutUnit}>kg</span>
              </div>
              {latestRiskStatus.isRisk && (
                <p style={styles.riskMessage}>{latestRiskStatus.msg}</p>
              )}
              <p style={styles.readoutFootnote}>
                Hệ thống cảnh báo khi cân nặng thay đổi hơn 2kg trong 7 ngày,
                hoặc hơn 5% trong 30 ngày so với 1 lần đo trước đó. Thay đổi
                diễn ra chậm hơn (nhiều tháng) hiện chưa được theo dõi tự động.
              </p>
            </div>

            {/* ===== LỊCH SỬ ĐO - danh sách kiểu bảng, đường kẻ mảnh ===== */}
            <div style={styles.historySection}>
              <button onClick={handleToggleLogs} style={styles.toggleLink}>
                {showLogs ? "Ẩn lịch sử đo" : "Xem lịch sử đo"}
                <span style={styles.toggleChevron}>
                  {showLogs ? "︿" : "﹀"}
                </span>
              </button>

              {showLogs && (
                <div style={styles.historyList}>
                  {sortedLogs.length === 0 ? (
                    <p style={styles.emptyText}>
                      Chưa có dữ liệu đo nào được ghi nhận.
                    </p>
                  ) : (
                    <>
                      <div style={styles.historyHeadRow}>
                        <span>Thời điểm đo</span>
                        <span>Cân nặng</span>
                      </div>
                      {pagedLogs.map((log) => {
                        const logRisk = evaluateLogRisk(log, sortedLogs);
                        return (
                          <div key={log.logId} style={styles.historyRow}>
                            <div style={styles.historyDateCol}>
                              <span style={styles.historyDate}>
                                {formatDate(log.measuredAt)}
                              </span>
                              <span style={styles.historyTime}>
                                {new Date(log.measuredAt).toLocaleTimeString(
                                  "vi-VN",
                                )}
                              </span>
                              {logRisk.isRisk && (
                                <span style={styles.inlineRiskTag}>
                                  Nguy cơ · {logRisk.msg}
                                </span>
                              )}
                            </div>
                            <span
                              style={{
                                ...styles.historyWeight,
                                color: logRisk.isRisk
                                  ? COLORS.risk
                                  : COLORS.ink,
                              }}
                            >
                              {formatWeight(log.weightKg)} kg
                            </span>
                          </div>
                        );
                      })}

                      {sortedLogs.length > LOGS_PER_PAGE && (
                        <div style={styles.paginationRow}>
                          <button
                            style={{
                              ...styles.pageBtn,
                              ...(logPage === 1 ? styles.pageBtnDisabled : {}),
                            }}
                            disabled={logPage === 1}
                            onClick={() => setLogPage((p) => p - 1)}
                          >
                            ← Trước
                          </button>
                          <span style={styles.pageIndicator}>
                            Trang {logPage}/{totalPages}
                          </span>
                          <button
                            style={{
                              ...styles.pageBtn,
                              ...(logPage >= totalPages
                                ? styles.pageBtnDisabled
                                : {}),
                            }}
                            disabled={logPage >= totalPages}
                            onClick={() => setLogPage((p) => p + 1)}
                          >
                            Sau →
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ============================================================
// TOKENS - bảng màu lâm sàng riêng, không dùng gradient teal mặc định
// ============================================================
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
  container: {
    width: "100%",
    maxWidth: "620px",
    minWidth: 0,
  },
  header: {
    borderBottom: `1px solid ${COLORS.hairline}`,
    paddingBottom: "20px",
    marginBottom: "32px",
  },
  headerTopRow: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  avatar: {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    objectFit: "cover",
    flexShrink: 0,
  },
  avatarPlaceholder: {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    background: COLORS.paper,
    border: `1px solid ${COLORS.hairline}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    fontWeight: 700,
    color: COLORS.muted,
    flexShrink: 0,
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
    fontSize: "30px",
    fontWeight: 700,
    color: COLORS.ink,
    margin: "0 0 10px 0",
    lineHeight: 1.15,
    letterSpacing: "-0.01em",
  },
  headerMetaRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "8px",
    fontSize: "15px",
    color: COLORS.muted,
  },
  headerMetaItem: {
    fontFamily: FONT_NUMBER,
    fontSize: "14px",
  },
  metaDivider: {
    color: COLORS.hairline,
  },
  // ===== Ô ĐỌC SỐ =====
  readout: {
    background: COLORS.paperRaised,
    border: `1px solid ${COLORS.hairline}`,
    borderTop: "3px solid",
    borderRadius: "8px",
    padding: "28px 28px 24px",
    marginBottom: "32px",
    textAlign: "center",
  },
  readoutLabel: {
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: COLORS.muted,
    marginBottom: "10px",
  },
  readoutValue: {
    fontFamily: FONT_NUMBER,
    fontSize: "clamp(48px, 12vw, 64px)",
    fontWeight: 700,
    lineHeight: 1,
    fontVariantNumeric: "tabular-nums",
  },
  readoutUnit: {
    fontSize: "22px",
    fontWeight: 600,
    marginLeft: "8px",
    color: COLORS.muted,
  },
  riskMessage: {
    fontSize: "15px",
    color: COLORS.risk,
    marginTop: "14px",
    marginBottom: 0,
    marginLeft: "auto",
    marginRight: "auto",
    lineHeight: 1.5,
    maxWidth: "44ch",
  },
  readoutFootnote: {
    fontSize: "13px",
    color: COLORS.muted,
    marginTop: "16px",
    marginBottom: 0,
    lineHeight: 1.5,
    paddingTop: "14px",
    borderTop: `1px solid ${COLORS.hairline}`,
    textAlign: "left",
  },
  // ===== LỊCH SỬ =====
  historySection: {
    borderTop: `1px solid ${COLORS.hairline}`,
    paddingTop: "20px",
  },
  toggleLink: {
    background: "none",
    border: "none",
    padding: 0,
    fontFamily: FONT_SANS,
    fontSize: "15px",
    fontWeight: 600,
    color: COLORS.safe,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  toggleChevron: {
    fontSize: "12px",
  },
  historyList: {
    marginTop: "18px",
  },
  emptyText: {
    fontSize: "15px",
    color: COLORS.muted,
    padding: "8px 0",
  },
  historyHeadRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: COLORS.muted,
    paddingBottom: "10px",
    borderBottom: `1px solid ${COLORS.hairline}`,
  },
  historyRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    padding: "14px 0",
    borderBottom: `1px solid ${COLORS.hairline}`,
  },
  historyDateCol: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    minWidth: 0,
  },
  historyDate: {
    fontFamily: FONT_NUMBER,
    fontSize: "15px",
    color: COLORS.ink,
    fontWeight: 600,
  },
  historyTime: {
    fontFamily: FONT_NUMBER,
    fontSize: "13px",
    color: COLORS.muted,
  },
  inlineRiskTag: {
    fontSize: "13px",
    color: COLORS.risk,
    marginTop: "4px",
    maxWidth: "38ch",
    lineHeight: 1.4,
  },
  historyWeight: {
    fontFamily: FONT_NUMBER,
    fontSize: "18px",
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  },
  paginationRow: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "20px",
    marginTop: "20px",
    paddingTop: "16px",
  },
  pageBtn: {
    padding: "6px 14px",
    borderRadius: "6px",
    border: `1px solid ${COLORS.hairline}`,
    background: COLORS.paperRaised,
    color: COLORS.ink,
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: FONT_SANS,
  },
  pageBtnDisabled: {
    color: COLORS.muted,
    cursor: "not-allowed",
    opacity: 0.5,
  },
  pageIndicator: {
    fontFamily: FONT_NUMBER,
    fontSize: "13px",
    color: COLORS.muted,
  },
  stateWrapper: {
    minHeight: "calc(100vh - 70px)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: FONT_SANS,
    background: COLORS.paper,
  },
  stateCard: {
    color: COLORS.ink,
    fontSize: "16px",
  },
  loadingText: {
    marginTop: "14px",
    color: COLORS.muted,
    fontSize: "15px",
  },
  spinner: {
    width: "28px",
    height: "28px",
    border: `3px solid ${COLORS.hairline}`,
    borderTop: `3px solid ${COLORS.safe}`,
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
};

export default Profile;
