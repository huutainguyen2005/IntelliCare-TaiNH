import React, { useState, useEffect } from "react";
import axiosClient from "../../api/axiosClient";
import Modal from "../../components/Modal";

interface ClassOption {
  classId: number;
  name: string;
}

interface RollCallStatus {
  rollCallSessionId: number;
  classId: number;
  className: string;
  status: "InProgress" | "Completed";
  currentStudentId: number;
  currentStudentName: string;
  currentStudentIndex: number;
  measurementStatusLabel: "AwaitingStart" | "Pending" | "Completed";
  lastWeightKg: number | null;
}

// Màn hình giáo viên: chọn lớp -> bắt đầu buổi cân -> lần lượt từng học
// sinh theo index_number. Dùng chung state machine kiểu với Scanner.tsx
// (Kiosk) để nhất quán trải nghiệm: SELECT_CLASS -> READY -> PENDING -> RESULT
export default function ClassRollCall() {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [deviceId, setDeviceId] = useState("SCALE_SCHOOL_001");
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);

  const [status, setStatus] = useState<RollCallStatus | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    message: string;
    type: "success" | "error" | "warning";
  }>({ isOpen: false, message: "", type: "warning" });

  const showModal = (
    message: string,
    type: "success" | "error" | "warning",
  ) => {
    setModalConfig({ isOpen: true, message, type });
  };

  // Danh sách lớp - lấy qua toàn bộ trường (giáo viên chỉ nên thấy đúng
  // trường của mình, việc lọc theo school_id của giáo viên nên làm ở BE
  // sau này - hiện tại lấy hết cho đơn giản ở MVP)
  useEffect(() => {
    const fetchClasses = async () => {
      setIsLoadingClasses(true);
      try {
        const schoolsRes = await axiosClient.get("/api/schools");
        const allClasses: ClassOption[] = [];
        for (const school of schoolsRes.data) {
          const classesRes = await axiosClient.get(
            `/api/schools/${school.schoolId}/classes`,
          );
          for (const c of classesRes.data) {
            allClasses.push({ classId: c.classId, name: c.name });
          }
        }
        setClasses(allClasses);
      } catch (error) {
        console.error("Lỗi khi tải danh sách lớp:", error);
      } finally {
        setIsLoadingClasses(false);
      }
    };
    fetchClasses();
  }, []);

  const handleStartRollCall = async () => {
    if (!selectedClassId) {
      showModal("Vui lòng chọn lớp trước khi bắt đầu!", "warning");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await axiosClient.post("/api/roll-call/start", {
        classId: Number(selectedClassId),
        deviceId,
      });
      setStatus(res.data);
    } catch (error: any) {
      showModal(
        error.response?.data?.message || "Không thể bắt đầu buổi cân!",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartWeighing = async () => {
    if (!status) return;
    setIsSubmitting(true);
    try {
      const res = await axiosClient.post(
        `/api/roll-call/${status.rollCallSessionId}/start-weighing`,
      );
      setStatus(res.data);
    } catch (error: any) {
      showModal(
        error.response?.data?.message || "Không thể bắt đầu cân!",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmNext = async () => {
    if (!status) return;
    setIsSubmitting(true);
    try {
      const res = await axiosClient.post(
        `/api/roll-call/${status.rollCallSessionId}/confirm-next`,
      );
      setStatus(res.data);
      if (res.data.status === "Completed") {
        showModal("Đã hoàn thành cân cho toàn bộ lớp!", "success");
      }
    } catch (error: any) {
      showModal(
        error.response?.data?.message || "Không thể chuyển tiếp!",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setStatus(null);
    setSelectedClassId("");
  };

  // Polling kết quả cân khi đang ở trạng thái Pending (ESP32 gửi cân nặng
  // lên bất kỳ lúc nào, cần chủ động hỏi lại xem đã xong chưa)
  useEffect(() => {
    if (!status || status.measurementStatusLabel !== "Pending") return;

    const intervalId = setInterval(async () => {
      try {
        const res = await axiosClient.get(
          `/api/roll-call/${status.rollCallSessionId}/status`,
        );
        if (res.data.measurementStatusLabel === "Completed") {
          setStatus(res.data);
        }
      } catch (error) {
        console.error("Đang chờ cân...");
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [status]);

  const rollCallDone = status?.status === "Completed";

  return (
    <div style={styles.pageBackground}>
      <div style={styles.container}>
        {!status ? (
          // ===== BƯỚC 1: CHỌN LỚP =====
          <>
            <header style={styles.header}>
              <div style={styles.eyebrow}>Trường mầm non</div>
              <h1 style={styles.pageTitle}>Bắt đầu buổi cân</h1>
            </header>

            {isLoadingClasses ? (
              <p style={styles.stateText}>Đang tải danh sách lớp…</p>
            ) : classes.length === 0 ? (
              <p style={styles.stateText}>
                Chưa có lớp học nào. Vui lòng liên hệ Admin để tạo lớp trước.
              </p>
            ) : (
              <>
                <label style={styles.label}>Chọn lớp</label>
                <select
                  style={styles.input}
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                >
                  <option value="">-- Chọn lớp --</option>
                  {classes.map((c) => (
                    <option key={c.classId} value={c.classId}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <label style={styles.label}>Mã thiết bị cân</label>
                <input
                  style={styles.input}
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                />

                <button
                  style={styles.primaryButton}
                  disabled={isSubmitting}
                  onClick={handleStartRollCall}
                >
                  {isSubmitting ? "Đang bắt đầu…" : "Bắt đầu buổi cân"}
                </button>
              </>
            )}
          </>
        ) : rollCallDone ? (
          // ===== ĐÃ CÂN XONG CẢ LỚP =====
          <div style={styles.centerLayout}>
            <p style={styles.eyebrow}>{status.className}</p>
            <h1 style={styles.instruction}>Đã hoàn thành!</h1>
            <p style={styles.instructionSecondary}>
              Đã cân xong toàn bộ học sinh trong lớp.
            </p>
            <button style={styles.primaryButton} onClick={handleReset}>
              Bắt đầu buổi cân khác
            </button>
          </div>
        ) : (
          // ===== ĐANG ĐIỂM DANH CÂN =====
          <div style={styles.centerLayout}>
            <p style={styles.eyebrow}>
              {status.className} · Học sinh số {status.currentStudentIndex}
            </p>
            <h1 style={styles.instruction}>{status.currentStudentName}</h1>

            {status.measurementStatusLabel === "AwaitingStart" && (
              <>
                <p style={styles.instructionSecondary}>
                  Mời em bước lên bàn cân khi đã sẵn sàng.
                </p>
                <button
                  style={styles.primaryButton}
                  disabled={isSubmitting}
                  onClick={handleStartWeighing}
                >
                  Tiến hành cân
                </button>
              </>
            )}

            {status.measurementStatusLabel === "Pending" && (
              <>
                <div style={styles.pulseRing}>
                  <div style={styles.pulseDot} />
                </div>
                <p style={styles.instructionSecondary}>
                  Đang chờ dữ liệu từ cân…
                </p>
              </>
            )}

            {status.measurementStatusLabel === "Completed" && (
              <>
                <div style={styles.resultValue}>
                  {status.lastWeightKg?.toFixed(2)}
                  <span style={styles.resultUnit}> kg</span>
                </div>
                <button
                  style={styles.primaryButton}
                  disabled={isSubmitting}
                  onClick={handleConfirmNext}
                >
                  Xác nhận, học sinh tiếp theo
                </button>
              </>
            )}

            <button style={styles.linkButton} onClick={handleReset}>
              Hủy buổi cân này
            </button>
          </div>
        )}
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
  accent: "#0B6E4F",
  muted: "#6B7268",
  hairline: "#D8DAD3",
  error: "#9A3324",
};

const FONT_SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const FONT_NUMBER =
  "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const styles: Record<string, React.CSSProperties> = {
  pageBackground: {
    minHeight: "calc(100vh - 80px)",
    background: COLORS.paper,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "40px 20px",
    fontFamily: FONT_SANS,
    boxSizing: "border-box",
  },
  container: {
    width: "100%",
    maxWidth: "460px",
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
    fontSize: "24px",
    fontWeight: 700,
    color: COLORS.ink,
    margin: 0,
  },
  stateText: {
    color: COLORS.muted,
    fontSize: "15px",
    textAlign: "center",
    padding: "20px 0",
  },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: 600,
    color: COLORS.muted,
    marginTop: "16px",
    marginBottom: "6px",
  },
  input: {
    width: "100%",
    padding: "11px 14px",
    borderRadius: "8px",
    border: `1px solid ${COLORS.hairline}`,
    fontSize: "14px",
    boxSizing: "border-box",
    outline: "none",
    fontFamily: FONT_SANS,
    color: COLORS.ink,
    background: COLORS.paperRaised,
  },
  primaryButton: {
    width: "100%",
    padding: "16px",
    background: COLORS.accent,
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    fontSize: "16px",
    fontWeight: 700,
    cursor: "pointer",
    marginTop: "24px",
    fontFamily: FONT_SANS,
  },
  linkButton: {
    display: "block",
    margin: "20px auto 0",
    background: "transparent",
    border: "none",
    color: COLORS.muted,
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: FONT_SANS,
  },
  centerLayout: {
    textAlign: "center",
  },
  instruction: {
    fontSize: "clamp(26px, 5vw, 34px)",
    fontWeight: 700,
    color: COLORS.ink,
    margin: "0 0 10px 0",
  },
  instructionSecondary: {
    fontSize: "16px",
    color: COLORS.muted,
    margin: "0 0 20px 0",
  },
  pulseRing: {
    width: "72px",
    height: "72px",
    borderRadius: "50%",
    border: `2px solid ${COLORS.hairline}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "24px auto",
  },
  pulseDot: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    background: COLORS.accent,
  },
  resultValue: {
    fontFamily: FONT_NUMBER,
    fontSize: "clamp(48px, 12vw, 64px)",
    fontWeight: 700,
    color: COLORS.ink,
    margin: "20px 0",
  },
  resultUnit: {
    fontSize: "22px",
    fontWeight: 600,
    color: COLORS.muted,
  },
};
