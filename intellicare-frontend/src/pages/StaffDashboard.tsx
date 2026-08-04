import React, { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";

interface WeightLog {
  logId: number;
  measuredAt: string;
  weightKg: number;
}

interface PatientListItem {
  patientId: number;
  fullName: string;
  phoneNumber: string;
  gender: string | null;
  weightLog: WeightLog[];
}

interface PatientDetailData {
  patientCode: string;
  fullName: string;
  phoneNumber: string;
  email: string | null;
  address: string | null;
  dob: string;
  faceImageUrl: string | null;
  weightLog: WeightLog[];
}

export default function StaffDashboard() {
  const formatDate = (dateInput: string | Date): string => {
    const d = new Date(dateInput);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${d.getFullYear()}`;
  };

  const formatDateTime = (dateInput: string | Date): string => {
    const d = new Date(dateInput);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${formatDate(d)} ${hh}:${mm}`;
  };

  const [allPatients, setAllPatients] = useState<PatientListItem[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PER_PAGE = 8;

  const [genderFilter, setGenderFilter] = useState<"ALL" | "Nam" | "Nữ">("ALL");
  const [minWeight, setMinWeight] = useState("");
  const [maxWeight, setMaxWeight] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] =
    useState<PatientDetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    const fetchAllPatients = async () => {
      setIsLoadingList(true);
      try {
        const res = await axiosClient.get("/api/patients", {
          params: { page: 0, size: 1000 },
        });
        const measured = (res.data.content as PatientListItem[]).filter(
          (p) => p.weightLog && p.weightLog.length > 0,
        );
        setAllPatients(measured);
      } catch (error) {
        console.error("Lỗi khi tải danh sách bệnh nhân:", error);
      } finally {
        setIsLoadingList(false);
      }
    };
    fetchAllPatients();
  }, []);

  const getLatestWeight = (logs: WeightLog[]): number | null => {
    if (!logs || logs.length === 0) return null;
    const sorted = [...logs].sort(
      (a, b) =>
        new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime(),
    );
    return sorted[0].weightKg;
  };

  const filteredPatients = allPatients.filter((p) => {
    const kw = search.trim().toLowerCase();
    const matchSearch =
      !kw ||
      p.fullName.toLowerCase().includes(kw) ||
      p.phoneNumber.includes(search.trim());

    const matchGender = genderFilter === "ALL" || p.gender === genderFilter;

    const latestWeight = getLatestWeight(p.weightLog);
    const min = minWeight ? Number(minWeight) : null;
    const max = maxWeight ? Number(maxWeight) : null;
    const matchWeight =
      (min === null && max === null) ||
      (latestWeight !== null &&
        (min === null || latestWeight >= min) &&
        (max === null || latestWeight <= max));

    const matchDate =
      (!dateFrom && !dateTo) ||
      p.weightLog.some((log) => {
        const logDate = log.measuredAt.slice(0, 10);
        return (
          (!dateFrom || logDate >= dateFrom) && (!dateTo || logDate <= dateTo)
        );
      });

    return matchSearch && matchGender && matchWeight && matchDate;
  });

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / PER_PAGE));
  const pagedPatients = filteredPatients.slice(
    (page - 1) * PER_PAGE,
    page * PER_PAGE,
  );

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isModalOpen]);

  const handleOpenModal = async (patientId: number) => {
    setIsModalOpen(true);
    setLoadingDetail(true);
    setShowLogs(false);

    try {
      const res = await axiosClient.get(`/api/patients/${patientId}`);
      setSelectedPatient(res.data);
    } catch (error) {
      console.error("Lỗi lấy dữ liệu chi tiết từ máy chủ:", error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPatient(null);
    setShowLogs(false);
  };

  // Thuật toán kiểm tra rủi ro sức khỏe (giữ nguyên, không đổi)
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

  const sortedLogs = selectedPatient?.weightLog
    ? [...selectedPatient.weightLog].sort(
        (a, b) =>
          new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime(),
      )
    : [];
  const latestLog = sortedLogs.length > 0 ? sortedLogs[0] : null;
  const latestRiskStatus = latestLog
    ? evaluateLogRisk(latestLog, sortedLogs)
    : { isRisk: false, msg: "" };

  return (
    <div style={styles.pageBackground}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.eyebrow}>Danh sách bệnh nhân</div>
          <h1 style={styles.pageTitle}>Quản lý bệnh nhân</h1>
        </header>

        {/* ===== THANH TRA CỨU + LỌC ===== */}
        <div style={styles.searchBar}>
          <input
            style={styles.searchInput}
            placeholder="Tìm theo tên hoặc số điện thoại"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div style={styles.filterRow}>
          <select
            style={styles.filterSelect}
            value={genderFilter}
            onChange={(e) => {
              setGenderFilter(e.target.value as typeof genderFilter);
              setPage(1);
            }}
          >
            <option value="ALL">Tất cả giới tính</option>
            <option value="Nam">Nam</option>
            <option value="Nữ">Nữ</option>
          </select>

          <input
            style={styles.filterNumberInput}
            type="number"
            placeholder="Từ (kg)"
            value={minWeight}
            onChange={(e) => {
              setMinWeight(e.target.value);
              setPage(1);
            }}
          />
          <input
            style={styles.filterNumberInput}
            type="number"
            placeholder="Đến (kg)"
            value={maxWeight}
            onChange={(e) => {
              setMaxWeight(e.target.value);
              setPage(1);
            }}
          />
          <input
            style={styles.filterDateInput}
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
          />
          <span style={styles.filterArrow}>→</span>
          <input
            style={styles.filterDateInput}
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {/* ===== BẢNG DỮ LIỆU ===== */}
        {isLoadingList ? (
          <p style={styles.stateText}>Đang tải danh sách…</p>
        ) : (
          <>
            <div style={styles.table}>
              <div style={styles.tableHeadRow}>
                <span>Bệnh nhân</span>
                <span>Cân nặng gần nhất</span>
              </div>

              {pagedPatients.map((p) => {
                const latest = getLatestWeight(p.weightLog);
                return (
                  <div
                    key={p.patientId}
                    style={styles.tableRow}
                    onClick={() => handleOpenModal(p.patientId)}
                  >
                    <div style={styles.rowMainCol}>
                      <span style={styles.rowName}>{p.fullName}</span>
                      <span style={styles.rowMeta}>
                        {p.phoneNumber}
                        {p.gender ? ` · ${p.gender}` : ""}
                      </span>
                    </div>
                    <div style={styles.rowRightCol}>
                      <span style={styles.rowWeight}>
                        {latest !== null ? `${latest} kg` : "—"}
                      </span>
                      <button
                        style={styles.rowButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenModal(p.patientId);
                        }}
                      >
                        Xem hồ sơ
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredPatients.length === 0 && (
                <p style={styles.stateText}>
                  Không tìm thấy hồ sơ bệnh nhân phù hợp.
                </p>
              )}
            </div>

            {filteredPatients.length > PER_PAGE && (
              <div style={styles.paginationRow}>
                <button
                  style={{
                    ...styles.pageBtn,
                    ...(page === 1 ? styles.pageBtnDisabled : {}),
                  }}
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ← Trước
                </button>
                <span style={styles.pageIndicator}>
                  Trang {page}/{totalPages}
                </span>
                <button
                  style={{
                    ...styles.pageBtn,
                    ...(page >= totalPages ? styles.pageBtnDisabled : {}),
                  }}
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Sau →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ===== MODAL CHI TIẾT - dùng lại đúng pattern "ô đọc số + bảng
          lịch sử" đã thiết lập ở Profile.tsx, giữ nhất quán hệ thống ===== */}
      {isModalOpen && (
        <div style={styles.modalOverlay} onClick={handleCloseModal}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button style={styles.modalCloseBtn} onClick={handleCloseModal}>
              &times;
            </button>

            {loadingDetail ? (
              <div style={styles.loadingWrapper}>
                <div style={styles.spinner}></div>
                <p style={styles.loadingText}>Đang tải hồ sơ…</p>
              </div>
            ) : selectedPatient ? (
              <>
                <header style={styles.modalHeader}>
                  {selectedPatient.faceImageUrl ? (
                    <img
                      src={selectedPatient.faceImageUrl}
                      alt=""
                      style={styles.avatar}
                    />
                  ) : (
                    <div style={styles.avatarPlaceholder}>
                      {selectedPatient.fullName.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div style={styles.eyebrow}>
                      {selectedPatient.patientCode}
                    </div>
                    <h2 style={styles.modalPatientName}>
                      {selectedPatient.fullName}
                    </h2>
                    <div style={styles.modalMetaRowSecondary}>
                      Số điện thoại: {selectedPatient.phoneNumber}
                    </div>
                    {selectedPatient.email && (
                      <div style={styles.modalMetaRowSecondary}>
                        Email: {selectedPatient.email}
                      </div>
                    )}
                    <div style={styles.modalMetaRowSecondary}>
                      Ngày tháng năm sinh: {formatDate(selectedPatient.dob)}
                    </div>
                    {selectedPatient.address && (
                      <div style={styles.modalMetaRowSecondary}>
                        Địa chỉ: {selectedPatient.address}
                      </div>
                    )}
                  </div>
                </header>

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
                    {latestLog ? latestLog.weightKg : "—"}
                    <span style={styles.readoutUnit}>kg</span>
                  </div>
                  {latestRiskStatus.isRisk && (
                    <p style={styles.riskMessage}>{latestRiskStatus.msg}</p>
                  )}
                </div>

                <div style={styles.historySection}>
                  <button
                    onClick={() => setShowLogs(!showLogs)}
                    style={styles.toggleLink}
                  >
                    {showLogs ? "Ẩn lịch sử đo" : "Xem toàn bộ lịch sử đo"}
                    <span style={styles.toggleChevron}>
                      {showLogs ? "︿" : "﹀"}
                    </span>
                  </button>

                  {showLogs && (
                    <div style={styles.historyList}>
                      {sortedLogs.length === 0 ? (
                        <p style={styles.stateText}>
                          Chưa có dữ liệu đo nào được ghi nhận.
                        </p>
                      ) : (
                        <>
                          <div style={styles.historyHeadRow}>
                            <span>Thời điểm đo</span>
                            <span>Cân nặng</span>
                          </div>
                          {sortedLogs.map((log) => {
                            const logRisk = evaluateLogRisk(log, sortedLogs);
                            return (
                              <div key={log.logId} style={styles.historyRow}>
                                <div style={styles.historyDateCol}>
                                  <span style={styles.historyDate}>
                                    {formatDateTime(log.measuredAt)}
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
                                  {log.weightKg} kg
                                </span>
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={styles.loadingWrapper}>
                <p style={{ color: COLORS.risk }}>
                  Không tìm thấy dữ liệu hồ sơ hợp lệ.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// TOKENS - dùng chung bảng màu lâm sàng với Profile.tsx/Scanner.tsx
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
    minHeight: "calc(100vh - 80px)",
    background: COLORS.paper,
    display: "flex",
    justifyContent: "center",
    padding: "48px 20px",
    fontFamily: FONT_SANS,
    boxSizing: "border-box",
  },
  container: {
    width: "100%",
    maxWidth: "760px",
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
  searchBar: {
    marginBottom: "12px",
  },
  searchInput: {
    width: "100%",
    padding: "12px 16px",
    fontSize: "15px",
    borderRadius: "8px",
    border: `1px solid ${COLORS.hairline}`,
    background: COLORS.paperRaised,
    color: COLORS.ink,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: FONT_SANS,
  },
  filterRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: "28px",
  },
  filterSelect: {
    flex: "1 1 150px",
    padding: "9px 10px",
    borderRadius: "6px",
    border: `1px solid ${COLORS.hairline}`,
    fontSize: "13px",
    color: COLORS.ink,
    background: COLORS.paperRaised,
    outline: "none",
    fontFamily: FONT_SANS,
  },
  filterNumberInput: {
    flex: "1 1 90px",
    padding: "9px 10px",
    borderRadius: "6px",
    border: `1px solid ${COLORS.hairline}`,
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: FONT_SANS,
  },
  filterDateInput: {
    flex: "1 1 130px",
    padding: "8px 10px",
    borderRadius: "6px",
    border: `1px solid ${COLORS.hairline}`,
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: FONT_SANS,
  },
  filterArrow: {
    color: COLORS.muted,
    fontSize: "13px",
  },
  // ===== BẢNG DỮ LIỆU =====
  table: {
    borderTop: `1px solid ${COLORS.hairline}`,
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
    padding: "16px 0",
    borderBottom: `1px solid ${COLORS.hairline}`,
    cursor: "pointer",
    gap: "16px",
  },
  rowMainCol: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    minWidth: 0,
  },
  rowName: {
    fontSize: "16px",
    fontWeight: 600,
    color: COLORS.ink,
  },
  rowMeta: {
    fontSize: "13px",
    color: COLORS.muted,
  },
  rowRightCol: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    flexShrink: 0,
  },
  rowWeight: {
    fontFamily: FONT_NUMBER,
    fontSize: "17px",
    fontWeight: 700,
    color: COLORS.ink,
    fontVariantNumeric: "tabular-nums",
    minWidth: "64px",
    textAlign: "right",
  },
  rowButton: {
    padding: "8px 16px",
    borderRadius: "6px",
    border: `1px solid ${COLORS.ink}`,
    background: "transparent",
    color: COLORS.ink,
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: FONT_SANS,
    whiteSpace: "nowrap",
  },
  stateText: {
    textAlign: "center",
    color: COLORS.muted,
    fontSize: "15px",
    padding: "32px 0",
  },
  paginationRow: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "20px",
    marginTop: "24px",
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

  // ===== MODAL =====
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(18, 33, 26, 0.45)",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    overflowY: "auto",
    zIndex: 9999,
    padding: "60px 20px",
    boxSizing: "border-box",
  },
  modalContent: {
    background: COLORS.paperRaised,
    width: "100%",
    maxWidth: "600px",
    borderRadius: "12px",
    padding: "36px",
    position: "relative",
    boxSizing: "border-box",
  },
  modalCloseBtn: {
    position: "absolute",
    top: "20px",
    right: "20px",
    background: "transparent",
    border: "none",
    fontSize: "24px",
    color: COLORS.muted,
    cursor: "pointer",
    lineHeight: 1,
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    borderBottom: `1px solid ${COLORS.hairline}`,
    paddingBottom: "24px",
    marginBottom: "24px",
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
  modalPatientName: {
    fontSize: "22px",
    fontWeight: 700,
    color: COLORS.ink,
    margin: "0 0 6px 0",
  },
  modalMetaRow: {
    fontSize: "14px",
    color: COLORS.muted,
    display: "flex",
    gap: "8px",
  },
  modalMetaRowSecondary: {
    fontSize: "14px",
    color: COLORS.muted,
    marginTop: "4px",
  },
  metaDivider: {
    color: COLORS.hairline,
  },
  readout: {
    background: COLORS.paper,
    border: `1px solid ${COLORS.hairline}`,
    borderTop: "3px solid",
    borderRadius: "8px",
    padding: "22px 24px",
    marginBottom: "24px",
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
    fontSize: "44px",
    fontWeight: 700,
    lineHeight: 1,
    fontVariantNumeric: "tabular-nums",
  },
  readoutUnit: {
    fontSize: "18px",
    fontWeight: 600,
    marginLeft: "6px",
    color: COLORS.muted,
  },
  riskMessage: {
    fontSize: "14px",
    color: COLORS.risk,
    marginTop: "12px",
    marginBottom: 0,
    lineHeight: 1.5,
  },
  historySection: {},
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
    marginTop: "16px",
    maxHeight: "320px",
    overflowY: "auto",
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
    padding: "12px 0",
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
    fontSize: "14px",
    color: COLORS.ink,
    fontWeight: 600,
  },
  inlineRiskTag: {
    fontSize: "12px",
    color: COLORS.risk,
    marginTop: "2px",
  },
  historyWeight: {
    fontFamily: FONT_NUMBER,
    fontSize: "16px",
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  },
  loadingWrapper: {
    padding: "60px 20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: COLORS.muted,
    fontSize: "14px",
    marginTop: "12px",
  },
  spinner: {
    width: "26px",
    height: "26px",
    border: `3px solid ${COLORS.hairline}`,
    borderTop: `3px solid ${COLORS.safe}`,
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
};
