import React, { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import axiosClient from "../api/axiosClient";
import Modal from "../components/Modal";
import { useCustomAuth } from "../context/AuthContext";
import { speakWeight, formatWeight, unlockAudio } from "../utils/weightAudio";

interface CameraOption {
  id: string;
  label: string;
}

const STEPS = [
  { key: "IDLE", label: "Quét CCCD" },
  { key: "READY", label: "Xác nhận" },
  { key: "PENDING", label: "Đo cân" },
  { key: "COMPLETED", label: "Kết quả" },
] as const;

export default function Scanner() {
  const { user } = useCustomAuth();
  const [patientName, setPatientName] = useState<string>("");
  const [deviceId, setDeviceId] = useState("SCALE_001");
  const [status, setStatus] = useState<
    "IDLE" | "READY" | "PENDING" | "COMPLETED"
  >("IDLE");
  const [weightResult, setWeightResult] = useState<string | null>(null);
  const [isSubmittingScan, setIsSubmittingScan] = useState(false);

  const [autoAdvanceSeconds, setAutoAdvanceSeconds] = useState(30);

  const [cameras, setCameras] = useState<CameraOption[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [cameraError, setCameraError] = useState<string>("");
  const [manualQrInput, setManualQrInput] = useState<string>("");
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    message: string;
    type: "success" | "error" | "warning";
    onConfirm?: () => void;
  }>({ isOpen: false, message: "", type: "warning" });

  const showModal = (
    message: string,
    type: "success" | "error" | "warning",
    onConfirm?: () => void,
  ) => {
    setModalConfig({ isOpen: true, message, type, onConfirm });
  };

  const handleCloseModal = () => {
    setModalConfig((prev) => ({ ...prev, isOpen: false }));
    if (modalConfig.onConfirm) modalConfig.onConfirm();
  };

  // Xử lý dữ liệu sau khi có chuỗi CCCD. Gọi đúng endpoint BE:
  // POST /api/measurements/scan-qr - BE sẽ tự tạo bệnh nhân mới nếu CCCD
  // chưa từng đo và khởi tạo phiên đo ngay lập tức.
  const processScanRaw = async (rawInput: string) => {
    const fixedText = rawInput.trim();
    if (!fixedText || isSubmittingScan) return;

    if (fixedText.split("|").length < 7) {
      showModal(
        "Dữ liệu quét không hợp lệ (không đúng định dạng CCCD). Vui lòng quét lại!",
        "warning",
      );
      return;
    }

    setIsSubmittingScan(true);
    try {
      const response = await axiosClient.post("/api/measurements/scan-qr", {
        deviceId: deviceId,
        rawQrData: fixedText,
      });

      const session = response.data;

      if (user && user.role === "ROLE_PATIENT") {
        if (session.patientName !== user.fullName) {
          showModal(
            `Lỗi xác thực: Bạn đang đăng nhập là ${user.fullName}, không thể quét CCCD của ${session.patientName}!`,
            "error",
          );
          return;
        }
      }

      setPatientName(session.patientName);
      setStatus("READY");
    } catch (error: any) {
      const backendMsg =
        typeof error.response?.data === "string"
          ? error.response.data
          : error.response?.data?.message;
      showModal(backendMsg || "Lỗi mạng/Hệ thống: " + error.message, "error");
    } finally {
      setIsSubmittingScan(false);
    }
  };

  useEffect(() => {
    if (status !== "IDLE") return;

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (!devices || devices.length === 0) {
          setCameraError("Không tìm thấy camera nào trên thiết bị này!");
          return;
        }
        setCameras(devices);
        setSelectedCameraId((prev) => prev || devices[0].id);
      })
      .catch(() => {
        setCameraError(
          "Không thể truy cập camera. Vui lòng cấp quyền camera cho trang này!",
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (status !== "IDLE" || !selectedCameraId) return;

    let isHandled = false;
    const html5QrCode = new Html5Qrcode("reader");
    html5QrCodeRef.current = html5QrCode;

    html5QrCode
      .start(
        selectedCameraId,
        { fps: 25, qrbox: { width: 280, height: 280 }, aspectRatio: 1.0 },
        async (decodedText) => {
          if (isHandled) return;
          isHandled = true;
          await processScanRaw(decodedText.trim());
        },
        (_error) => {},
      )
      .then(() => {
        isScanningRef.current = true;
      })
      .catch(() => {
        setCameraError(
          "Không thể khởi động camera đã chọn. Vui lòng thử camera khác!",
        );
      });

    return () => {
      if (isScanningRef.current) {
        html5QrCode
          .stop()
          .then(() => html5QrCode.clear())
          .catch(() => {});
        isScanningRef.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, selectedCameraId, deviceId, user]);

  const resetToScanScreen = () => {
    setStatus("IDLE");
    setPatientName("");
    setWeightResult(null);
  };

  useEffect(() => {
    if (status !== "COMPLETED") return;

    setAutoAdvanceSeconds(30);
    const countdownId = setInterval(() => {
      setAutoAdvanceSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(countdownId);
          resetToScanScreen();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;
    if (status === "PENDING") {
      intervalId = setInterval(async () => {
        try {
          const response = await axiosClient.get(
            `/api/measurements/result?deviceId=${deviceId}`,
          );
          if (response.data.status === "Completed") {
            setStatus("COMPLETED");
            setWeightResult(formatWeight(response.data.weightKg) + " kg");
            speakWeight(response.data.weightKg);
          }
        } catch (error) {
          console.error("Đang chờ cân...");
        }
      }, 2000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [status, deviceId]);

  const currentStepIndex = STEPS.findIndex((s) => s.key === status);

  return (
    <div style={styles.appContainer}>
      {/* ===== DẢI BƯỚC - định vị người dùng đang ở đâu trong quy trình ===== */}
      <div style={styles.stepRail}>
        {STEPS.map((step, i) => (
          <React.Fragment key={step.key}>
            <div style={styles.stepItem}>
              <div
                style={{
                  ...styles.stepDot,
                  ...(i < currentStepIndex
                    ? styles.stepDotDone
                    : i === currentStepIndex
                      ? styles.stepDotActive
                      : styles.stepDotUpcoming),
                }}
              >
                {i < currentStepIndex ? "✓" : i + 1}
              </div>
              <span
                style={{
                  ...styles.stepLabel,
                  ...(i === currentStepIndex ? styles.stepLabelActive : {}),
                }}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && <div style={styles.stepConnector} />}
          </React.Fragment>
        ))}
      </div>

      <main style={styles.stage}>
        {status === "IDLE" && (
          <div style={styles.idleLayout}>
            <h1 style={styles.instruction}>Đưa CCCD vào khung hình</h1>
            <p style={styles.subInstruction}>
              Giữ thẻ thẳng, cách camera khoảng 15–20cm
            </p>

            <style>{`
              #reader video { transform: none !important; -webkit-transform: none !important; }
            `}</style>
            <div style={styles.viewfinderFrame}>
              <div id="reader" style={styles.viewfinder}></div>
            </div>

            {isSubmittingScan && (
              <p style={styles.processingText}>Đang xử lý dữ liệu…</p>
            )}

            {cameraError && <p style={styles.errorText}>{cameraError}</p>}

            {/* Cấu hình phụ - camera/device id, tiết chế, không cạnh tranh
                với hướng dẫn chính */}
            <div style={styles.utilityRow}>
              {cameras.length > 0 && (
                <select
                  style={styles.utilitySelect}
                  value={selectedCameraId}
                  onChange={(e) => setSelectedCameraId(e.target.value)}
                >
                  {cameras.map((cam) => (
                    <option key={cam.id} value={cam.id}>
                      {cam.label || `Camera ${cam.id}`}
                    </option>
                  ))}
                </select>
              )}
              <input
                style={styles.utilityInput}
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                aria-label="Mã thiết bị"
              />
            </div>

            {import.meta.env.DEV && (
              <div style={styles.devPanel}>
                <p style={styles.devPanelLabel}>
                  [DEV] Dán chuỗi CCCD (không cần camera)
                </p>
                <textarea
                  style={styles.devTextarea}
                  rows={2}
                  placeholder="001095000123|012345678|NGUYỄN VĂN A|01012005|Nam|Địa chỉ...|25122021"
                  value={manualQrInput}
                  onChange={(e) => setManualQrInput(e.target.value)}
                />
                <button
                  style={styles.devButton}
                  disabled={isSubmittingScan}
                  onClick={async () => {
                    await processScanRaw(manualQrInput);
                    setManualQrInput("");
                  }}
                >
                  Xử lý chuỗi này
                </button>
              </div>
            )}
          </div>
        )}

        {status === "READY" && (
          <div style={styles.centerLayout}>
            <p style={styles.eyebrow}>Đã xác nhận danh tính</p>
            <h1 style={styles.patientNameDisplay}>{patientName}</h1>
            <p style={styles.instructionSecondary}>
              Vui lòng bước lên bàn cân khi đã sẵn sàng.
            </p>
            <button
              onClick={async () => {
                unlockAudio(); // Mở khóa NGAY trong hành động click thật
                try {
                  await axiosClient.post("/api/measurements/start-weighing", {
                    deviceId,
                  });
                  setStatus("PENDING");
                } catch (error: any) {
                  const backendMsg = error.response?.data?.message;
                  showModal(
                    backendMsg ||
                      "Không thể bắt đầu phiên cân. Vui lòng quét lại CCCD!",
                    "error",
                    () => resetToScanScreen(),
                  );
                }
              }}
              style={styles.primaryButton}
            >
              Tiến hành cân
            </button>
          </div>
        )}

        {status === "PENDING" && (
          <div style={styles.centerLayout}>
            <style>{`
              @keyframes kioskPulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.15); opacity: 0.7; }
              }
            `}</style>
            <div style={styles.pulseRing}>
              <div style={styles.pulseDot} />
            </div>
            <h1 style={styles.instruction}>Đứng yên trên bàn cân</h1>
            <p style={styles.instructionSecondary}>
              Đang chờ dữ liệu ổn định, vui lòng không di chuyển…
            </p>

            {import.meta.env.DEV && (
              <button
                onClick={async () => {
                  const fakeWeight =
                    Math.round((40 + Math.random() * 60) * 100) / 100;
                  try {
                    await axiosClient.post("/api/measurements/submit", {
                      deviceId,
                      weightKg: fakeWeight,
                    });
                  } catch (error: any) {
                    const backendMsg = error.response?.data;
                    showModal(
                      typeof backendMsg === "string"
                        ? backendMsg
                        : "Giả lập cân thất bại (xem Console).",
                      "error",
                    );
                    console.error(error);
                  }
                }}
                style={styles.devButtonStandalone}
              >
                [DEV] Giả lập cân ngay
              </button>
            )}
          </div>
        )}

        {status === "COMPLETED" && (
          <div style={styles.centerLayout}>
            <p style={styles.eyebrow}>Kết quả đo</p>
            <div style={styles.resultValue}>{weightResult}</div>
            <button onClick={resetToScanScreen} style={styles.primaryButton}>
              Xác nhận
            </button>
            <p style={styles.autoAdvanceText}>
              Tự động chuyển sau {autoAdvanceSeconds} giây
            </p>
          </div>
        )}
      </main>

      <Modal
        isOpen={modalConfig.isOpen}
        message={modalConfig.message}
        type={modalConfig.type}
        onClose={handleCloseModal}
      />
    </div>
  );
}

// ============================================================
// TOKENS - dùng chung bảng màu lâm sàng với Profile.tsx (nhất quán)
// ============================================================
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
  appContainer: {
    minHeight: "calc(100vh - 80px)",
    background: COLORS.paper,
    fontFamily: FONT_SANS,
    display: "flex",
    flexDirection: "column",
  },

  // ===== DẢI BƯỚC =====
  stepRail: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "24px 16px",
    borderBottom: `1px solid ${COLORS.hairline}`,
    flexWrap: "wrap",
  },
  stepItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  stepDot: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: 700,
    fontFamily: FONT_NUMBER,
    flexShrink: 0,
  },
  stepDotUpcoming: {
    background: COLORS.paperRaised,
    border: `1px solid ${COLORS.hairline}`,
    color: COLORS.muted,
  },
  stepDotActive: {
    background: COLORS.accent,
    color: "#ffffff",
  },
  stepDotDone: {
    background: COLORS.accent,
    color: "#ffffff",
  },
  stepLabel: {
    fontSize: "14px",
    fontWeight: 600,
    color: COLORS.muted,
  },
  stepLabelActive: {
    color: COLORS.ink,
  },
  stepConnector: {
    width: "32px",
    height: "1px",
    background: COLORS.hairline,
  },

  // ===== KHUNG SÂN KHẤU CHÍNH =====
  stage: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 20px 48px",
  },
  idleLayout: {
    width: "100%",
    maxWidth: "560px",
    textAlign: "center",
  },
  centerLayout: {
    width: "100%",
    maxWidth: "480px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },

  eyebrow: {
    fontSize: "13px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: COLORS.muted,
    marginBottom: "12px",
  },
  instruction: {
    fontSize: "clamp(28px, 5vw, 38px)",
    fontWeight: 700,
    color: COLORS.ink,
    margin: "0 0 10px 0",
    lineHeight: 1.2,
  },
  instructionSecondary: {
    fontSize: "18px",
    color: COLORS.muted,
    margin: "0 0 32px 0",
    lineHeight: 1.5,
  },
  subInstruction: {
    fontSize: "16px",
    color: COLORS.muted,
    margin: "0 0 28px 0",
  },
  patientNameDisplay: {
    fontSize: "clamp(32px, 6vw, 44px)",
    fontWeight: 700,
    color: COLORS.ink,
    margin: "0 0 16px 0",
    lineHeight: 1.15,
  },

  // ===== VIEWFINDER =====
  viewfinderFrame: {
    width: "100%",
    maxWidth: "360px",
    margin: "0 auto",
    border: `2px solid ${COLORS.ink}`,
    borderRadius: "12px",
    padding: "8px",
    background: COLORS.paperRaised,
  },
  viewfinder: {
    width: "100%",
    overflow: "hidden",
    borderRadius: "8px",
  },
  processingText: {
    fontSize: "15px",
    fontWeight: 600,
    color: COLORS.accent,
    marginTop: "16px",
  },
  errorText: {
    fontSize: "14px",
    color: COLORS.error,
    marginTop: "12px",
  },

  // ===== HÀNG TIỆN ÍCH (camera/device id) =====
  utilityRow: {
    display: "flex",
    gap: "10px",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: "28px",
  },
  utilitySelect: {
    padding: "8px 12px",
    borderRadius: "6px",
    border: `1px solid ${COLORS.hairline}`,
    fontSize: "13px",
    color: COLORS.ink,
    background: COLORS.paperRaised,
    fontFamily: FONT_SANS,
  },
  utilityInput: {
    padding: "8px 12px",
    borderRadius: "6px",
    border: `1px solid ${COLORS.hairline}`,
    fontSize: "13px",
    fontFamily: FONT_NUMBER,
    color: COLORS.ink,
    background: COLORS.paperRaised,
    width: "140px",
    textAlign: "center",
  },

  // ===== NÚT HÀNH ĐỘNG CHÍNH - to, dễ chạm =====
  primaryButton: {
    padding: "20px 48px",
    background: COLORS.accent,
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    fontSize: "20px",
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: FONT_SANS,
    minWidth: "260px",
  },

  // ===== TRẠNG THÁI ĐANG ĐO =====
  pulseRing: {
    width: "88px",
    height: "88px",
    borderRadius: "50%",
    border: `2px solid ${COLORS.hairline}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "28px",
  },
  pulseDot: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: COLORS.accent,
    animation: "kioskPulse 1.4s infinite ease-in-out",
  },

  // ===== KẾT QUẢ =====
  resultValue: {
    fontFamily: FONT_NUMBER,
    fontSize: "clamp(56px, 14vw, 88px)",
    fontWeight: 700,
    color: COLORS.ink,
    lineHeight: 1,
    margin: "0 0 36px 0",
    fontVariantNumeric: "tabular-nums",
  },
  autoAdvanceText: {
    marginTop: "16px",
    fontSize: "14px",
    color: COLORS.muted,
  },

  // ===== DEV TOOLS - thu nhỏ, đẩy xuống, không cạnh tranh UI thật =====
  devPanel: {
    marginTop: "36px",
    padding: "12px",
    border: `1px dashed ${COLORS.hairline}`,
    borderRadius: "8px",
    textAlign: "left",
    maxWidth: "360px",
    marginLeft: "auto",
    marginRight: "auto",
  },
  devPanelLabel: {
    fontSize: "11px",
    fontWeight: 700,
    color: COLORS.muted,
    margin: "0 0 6px 0",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  devTextarea: {
    width: "100%",
    padding: "8px",
    borderRadius: "6px",
    border: `1px solid ${COLORS.hairline}`,
    fontSize: "12px",
    fontFamily: FONT_NUMBER,
    boxSizing: "border-box",
    resize: "vertical",
  },
  devButton: {
    marginTop: "8px",
    width: "100%",
    padding: "8px",
    background: COLORS.paperRaised,
    color: COLORS.muted,
    border: `1px dashed ${COLORS.hairline}`,
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: FONT_SANS,
  },
  devButtonStandalone: {
    marginTop: "28px",
    padding: "8px 16px",
    background: "transparent",
    color: COLORS.muted,
    border: `1px dashed ${COLORS.hairline}`,
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: FONT_SANS,
  },
};
